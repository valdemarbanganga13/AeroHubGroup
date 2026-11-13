// Mini janela (Picture-in-Picture): aparecer e desaparecer na hora.
//
// - A mini janela é criada escondida assim que o app entra no Início (src/pip/pipWindow.ts),
//   já com tudo carregado. Aqui só se mostra ou esconde, o que leva poucos milissegundos.
// - O Windows avisa sempre que uma janela vem para a frente, se mexe, minimiza, aparece ou
//   desaparece. A cada aviso vê-se se o app ficou minimizado, tapado ou visível, e a mini
//   janela abre ou fecha logo (Definições → "Fixar estado no ecrã").
// - O som toca logo depois de a mini janela aparecer.
// - Mac (e outros sistemas): não há esses avisos, por isso vê-se de 250 em 250 ms se o app está
//   minimizado, e a mini janela aparece no canto de baixo à direita do ecrã (API do Tauri).
//   Lá não se deteta "tapado por outras janelas" (a opção fica escondida nas Definições).

use serde::Deserialize;
use std::sync::{mpsc, LazyLock, Mutex, MutexGuard, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Manager};

use crate::sound;

const MAIN_LABEL: &str = "main";
const PIP_LABEL: &str = "pip";

#[derive(Clone, Copy, PartialEq, Eq)]
enum MainState {
    Visible,
    Minimized,
    Covered,
}

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PipConfig {
    // O app está no Início (há mini janela pronta)
    active: bool,
    // Abrir sozinha ao minimizar / quando o app fica tapado (já com "só durante um voo" aplicado)
    auto_minimized: bool,
    auto_covered: bool,
    // Som ao aparecer ("off" = sem som)
    sound: String,
}

struct State {
    app: Option<AppHandle>,
    config: PipConfig,
    main_state: MainState,
    pip_visible: bool,
    // Botão ⧉: mostrar a mini janela assim que o app começar a minimizar
    show_on_minimize: bool,
    // Identificadores das janelas no Windows (guardados para não perguntar sempre ao Tauri)
    main_hwnd: Option<isize>,
    pip_hwnd: Option<isize>,
}

static STATE: LazyLock<Mutex<State>> = LazyLock::new(|| {
    Mutex::new(State {
        app: None,
        config: PipConfig::default(),
        main_state: MainState::Visible,
        pip_visible: false,
        show_on_minimize: false,
        main_hwnd: None,
        pip_hwnd: None,
    })
});

fn state() -> MutexGuard<'static, State> {
    STATE.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

// Aviso do Windows: o que aconteceu e a que janela
#[cfg_attr(not(windows), allow(dead_code))]
struct WinEvent {
    event: u32,
    hwnd: isize,
}

// Os avisos chegam na thread principal e seguem para outra thread, para não atrasar nada
static EVENTS: OnceLock<mpsc::Sender<WinEvent>> = OnceLock::new();

// Chamado no arranque do app (thread principal)
pub fn install(app: &AppHandle) {
    state().app = Some(app.clone());
    #[cfg(windows)]
    {
        let (sender, receiver) = mpsc::channel();
        let _ = EVENTS.set(sender);
        std::thread::spawn(move || watch(receiver));
        unsafe { win32::listen_to_windows() };
    }
    #[cfg(not(windows))]
    {
        let app = app.clone();
        std::thread::spawn(move || watch_portable(app));
    }
}

// --- Mac (e outros sistemas): sem avisos do sistema, verifica de 250 em 250 ms ---
// (compilado em todos os sistemas para ser verificado também no Windows)

#[cfg_attr(windows, allow(dead_code))]
fn watch_portable(app: AppHandle) {
    loop {
        std::thread::sleep(Duration::from_millis(250));
        let active = state().config.active;
        if !active {
            continue;
        }
        // Lê o estado da janela sem segurar o STATE (a pergunta vai à thread principal)
        let minimized = app
            .get_webview_window(MAIN_LABEL)
            .and_then(|main| main.is_minimized().ok())
            .unwrap_or(false);
        let next = if minimized { MainState::Minimized } else { MainState::Visible };

        let mut st = state();
        if !st.config.active || next == st.main_state {
            continue;
        }
        st.main_state = next;
        match next {
            MainState::Minimized => {
                let manual = std::mem::take(&mut st.show_on_minimize);
                if manual || st.config.auto_minimized {
                    show(&app, &mut st);
                }
            }
            _ => hide(&app, &mut st),
        }
    }
}

// Mostra a mini janela no canto de baixo à direita do ecrã onde está o app
#[cfg_attr(windows, allow(dead_code))]
fn show_portable(app: &AppHandle) -> bool {
    let Some(pip) = app.get_webview_window(PIP_LABEL) else {
        return false;
    };
    let monitor = app
        .get_webview_window(MAIN_LABEL)
        .and_then(|main| main.current_monitor().ok().flatten())
        .or_else(|| pip.primary_monitor().ok().flatten());
    if let (Some(monitor), Ok(size)) = (monitor, pip.outer_size()) {
        let area = monitor.work_area();
        let margin = (24.0 * monitor.scale_factor()) as i32;
        let x = area.position.x + area.size.width as i32 - size.width as i32 - margin;
        let y = area.position.y + area.size.height as i32 - size.height as i32 - margin;
        let _ = pip.set_position(tauri::PhysicalPosition::new(x, y));
    }
    let _ = pip.set_always_on_top(true);
    pip.show().is_ok()
}

#[cfg_attr(windows, allow(dead_code))]
fn hide_portable(app: &AppHandle) {
    if let Some(pip) = app.get_webview_window(PIP_LABEL) {
        let _ = pip.hide();
    }
}

#[cfg_attr(not(windows), allow(dead_code))]
fn watch(receiver: mpsc::Receiver<WinEvent>) {
    loop {
        // Também verifica de segundo a segundo, por segurança, mesmo sem avisos
        let mut minimizing = None;
        match receiver.recv_timeout(Duration::from_secs(1)) {
            Ok(event) => note(&mut minimizing, event),
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => return,
        }
        // Junta os avisos que chegaram entretanto numa só verificação
        while let Ok(event) = receiver.try_recv() {
            note(&mut minimizing, event);
        }
        evaluate(minimizing);
    }
}

// Guarda qual janela começou a minimizar (o Windows avisa antes da animação acabar)
#[cfg_attr(not(windows), allow(dead_code))]
fn note(minimizing: &mut Option<isize>, event: WinEvent) {
    #[cfg(windows)]
    match event.event {
        win32::EVENT_SYSTEM_MINIMIZESTART => *minimizing = Some(event.hwnd),
        win32::EVENT_SYSTEM_MINIMIZEEND => *minimizing = None,
        _ => {}
    }
    #[cfg(not(windows))]
    let _ = (minimizing, event);
}

fn main_hwnd(app: &AppHandle, st: &mut State) -> Option<isize> {
    cached(app, MAIN_LABEL, &mut st.main_hwnd)
}

fn pip_hwnd(app: &AppHandle, st: &mut State) -> Option<isize> {
    cached(app, PIP_LABEL, &mut st.pip_hwnd)
}

// A mini janela é criada de novo quando a língua muda: se a guardada já não existe, procura outra vez
fn cached(app: &AppHandle, label: &str, slot: &mut Option<isize>) -> Option<isize> {
    #[cfg(windows)]
    if let Some(hwnd) = *slot {
        if unsafe { win32::exists(hwnd) } {
            return Some(hwnd);
        }
    }
    *slot = hwnd_of(app, label);
    *slot
}

fn hwnd_of(app: &AppHandle, label: &str) -> Option<isize> {
    let window = app.get_webview_window(label)?;
    #[cfg(windows)]
    {
        window.hwnd().ok().map(|hwnd| hwnd.0 as isize)
    }
    #[cfg(not(windows))]
    {
        let _ = window;
        None
    }
}

#[cfg_attr(not(windows), allow(dead_code))]
fn evaluate(minimizing: Option<isize>) {
    let mut st = state();
    if !st.config.active {
        return;
    }
    let Some(app) = st.app.clone() else { return };
    let Some(main) = main_hwnd(&app, &mut st) else { return };

    let next = if minimizing == Some(main) {
        MainState::Minimized
    } else {
        read_state(main)
    };
    if next == st.main_state {
        return;
    }
    st.main_state = next;

    match next {
        MainState::Visible => hide(&app, &mut st),
        MainState::Minimized => {
            let manual = std::mem::take(&mut st.show_on_minimize);
            if manual || st.config.auto_minimized {
                show(&app, &mut st);
            }
        }
        MainState::Covered => {
            if st.config.auto_covered {
                show(&app, &mut st);
            }
        }
    }
}

#[cfg_attr(not(windows), allow(dead_code))]
fn read_state(main: isize) -> MainState {
    #[cfg(windows)]
    unsafe {
        win32::read_state(main)
    }
    #[cfg(not(windows))]
    {
        let _ = main;
        MainState::Visible
    }
}

fn show(app: &AppHandle, st: &mut State) {
    if st.pip_visible {
        return;
    }
    #[cfg(windows)]
    {
        let (Some(pip), Some(main)) = (pip_hwnd(app, st), main_hwnd(app, st)) else {
            return;
        };
        unsafe { win32::show_pip(pip, main) };
    }
    #[cfg(not(windows))]
    if !show_portable(app) {
        return;
    }
    st.pip_visible = true;
    // Só depois de a mini janela estar no ecrã
    sound::play(&st.config.sound);
}

fn hide(app: &AppHandle, st: &mut State) {
    if !st.pip_visible {
        return;
    }
    st.pip_visible = false;
    #[cfg(windows)]
    if let Some(pip) = pip_hwnd(app, st) {
        unsafe { win32::hide_pip(pip) };
    }
    #[cfg(not(windows))]
    hide_portable(app);
}

// --- Comandos chamados pelo app ---
// (assíncronos: correm fora da thread principal, que é a que desenha as janelas)

// Definições da mini janela (ao entrar no Início, ao mudar uma opção e ao sair do Início)
#[tauri::command]
pub async fn pip_configure(app: AppHandle, config: PipConfig) {
    let mut st = state();
    let was_active = st.config.active;
    st.config = config;
    if !st.config.active {
        hide(&app, &mut st);
    }
    if st.config.active != was_active {
        st.main_state = MainState::Visible;
        st.pip_visible = false;
        st.show_on_minimize = false;
    }
}

// Botão ⧉ no Início: minimiza o app e a mini janela aparece logo que ele começa a encolher
#[tauri::command]
pub async fn pip_show_and_minimize(app: AppHandle) {
    state().show_on_minimize = true;
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        let _ = main.minimize();
    }
}

// Clique na mini janela: esconde-a e traz o app de volta
#[tauri::command]
pub async fn pip_open_app(app: AppHandle) {
    hide(&app, &mut state());
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
}

// ✕ da mini janela: só a esconde. Volta a abrir sozinha quando o app aparecer e sair outra vez.
#[tauri::command]
pub async fn pip_dismiss(app: AppHandle) {
    hide(&app, &mut state());
}

#[cfg(windows)]
mod win32 {
    use super::{MainState, WinEvent, EVENTS};
    use std::mem;
    use windows_sys::Win32::{
        Foundation::{HWND, RECT},
        Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
        UI::{
            Accessibility::{SetWinEventHook, HWINEVENTHOOK},
            HiDpi::GetDpiForWindow,
            WindowsAndMessaging::{
                GetForegroundWindow, GetWindowRect, IsIconic, IsWindow, IsWindowVisible, SetWindowPos, ShowWindow,
                HWND_TOPMOST, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
                SW_HIDE,
            },
        },
    };

    // Distância ao canto superior direito do ecrã (antes da escala do Windows)
    const SCREEN_MARGIN: f64 = 16.0;

    const EVENT_SYSTEM_FOREGROUND: u32 = 0x0003;
    pub const EVENT_SYSTEM_MINIMIZESTART: u32 = 0x0016;
    pub const EVENT_SYSTEM_MINIMIZEEND: u32 = 0x0017;
    const EVENT_OBJECT_DESTROY: u32 = 0x8001;
    const EVENT_OBJECT_HIDE: u32 = 0x8003;
    const EVENT_OBJECT_LOCATIONCHANGE: u32 = 0x800B;
    const EVENT_OBJECT_CLOAKED: u32 = 0x8017;
    const EVENT_OBJECT_UNCLOAKED: u32 = 0x8018;
    const WINEVENT_OUTOFCONTEXT: u32 = 0;

    // Janela veio para a frente · minimizou/restaurou · apareceu/desapareceu/fechou ·
    // mexeu-se ou mudou de tamanho · foi escondida/mostrada pelo Windows (ex.: outra área de trabalho)
    pub unsafe fn listen_to_windows() {
        let ranges = [
            (EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND),
            (EVENT_SYSTEM_MINIMIZESTART, EVENT_SYSTEM_MINIMIZEEND),
            (EVENT_OBJECT_DESTROY, EVENT_OBJECT_HIDE),
            (EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE),
            (EVENT_OBJECT_CLOAKED, EVENT_OBJECT_UNCLOAKED),
        ];
        for (min, max) in ranges {
            SetWinEventHook(min, max, std::ptr::null_mut(), Some(on_event), 0, 0, WINEVENT_OUTOFCONTEXT);
        }
    }

    unsafe extern "system" fn on_event(
        _hook: HWINEVENTHOOK,
        event: u32,
        hwnd: HWND,
        id_object: i32,
        id_child: i32,
        _thread: u32,
        _time: u32,
    ) {
        // Só janelas inteiras (não o cursor, o texto, botões lá dentro, etc.)
        if hwnd.is_null() || id_object != 0 || id_child != 0 {
            return;
        }
        if let Some(sender) = EVENTS.get() {
            let _ = sender.send(WinEvent { event, hwnd: hwnd as isize });
        }
    }

    pub unsafe fn read_state(main: isize) -> MainState {
        let main = main as HWND;
        if IsIconic(main) != 0 {
            MainState::Minimized
        } else if IsWindowVisible(main) == 0 || GetForegroundWindow() == main {
            MainState::Visible
        } else if crate::occlusion::is_covered(main) {
            MainState::Covered
        } else {
            MainState::Visible
        }
    }

    // Canto superior direito do ecrã onde o app está, sempre por cima, sem tirar o foco a ninguém.
    // SWP_FRAMECHANGED: a janela nasceu escondida e o Windows ainda não tirou a moldura normal
    // (barra de título, fundo opaco); assim fica sem moldura e transparente, como foi desenhada.
    pub unsafe fn show_pip(pip: isize, main: isize) {
        let (pip, main) = (pip as HWND, main as HWND);
        let flags = SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_FRAMECHANGED;
        let mut info: MONITORINFO = mem::zeroed();
        info.cbSize = mem::size_of::<MONITORINFO>() as u32;
        let mut rect: RECT = mem::zeroed();
        let monitor = MonitorFromWindow(main, MONITOR_DEFAULTTONEAREST);
        if GetMonitorInfoW(monitor, &mut info) == 0 || GetWindowRect(pip, &mut rect) == 0 {
            SetWindowPos(pip, HWND_TOPMOST, 0, 0, 0, 0, flags | SWP_NOMOVE | SWP_NOSIZE);
            return;
        }
        let margin = (SCREEN_MARGIN * GetDpiForWindow(pip) as f64 / 96.0).round() as i32;
        let x = info.rcWork.right - (rect.right - rect.left) - margin;
        let y = info.rcWork.top + margin;
        SetWindowPos(pip, HWND_TOPMOST, x, y, 0, 0, flags | SWP_NOSIZE);
    }

    pub unsafe fn exists(hwnd: isize) -> bool {
        IsWindow(hwnd as HWND) != 0
    }

    pub unsafe fn hide_pip(pip: isize) {
        ShowWindow(pip as HWND, SW_HIDE);
    }
}
