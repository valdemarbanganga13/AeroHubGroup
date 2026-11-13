// AeroHub Connector Setup: o ficheiro que se descarrega do site.
// Mostra as telas de instalação do AeroHub Connector e, por trás delas, instala o app
// com o instalador do Tauri (NSIS) em modo silencioso — a pessoa nunca o vê.
// Depois aplica as opções escolhidas: atalho no ambiente de trabalho, iniciar com o Windows
// e a língua (o app abre já nessa língua, na tela de Boas-vindas).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

// O instalador do app, dentro deste .exe (ver build.rs)
static APP_INSTALLER: &[u8] = include_bytes!(env!("AEROHUB_APP_INSTALLER_PATH"));
// Tamanho do app depois de instalado (para a barra de progresso)
const APP_SIZE: Option<&str> = option_env!("AEROHUB_APP_SIZE");
const APP_SIZE_FALLBACK: u64 = 20 * 1024 * 1024;

const APP_EXE: &str = "aerohub-connector.exe";
const SHORTCUT_NAME: &str = "AeroHub Connector.lnk";
const RUN_VALUE_NAME: &str = "AeroHub Connector";
// Pasta de dados do app (identificador em src-tauri/tauri.conf.json)
const APP_DATA_FOLDER: &str = "com.aerohub.connector";
const PROGRESS_EVENT: &str = "setup-progress";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    install_path: String,
    desktop_shortcut: bool,
    start_with_windows: bool,
    language: String,
}

#[derive(Serialize, Clone)]
#[serde(tag = "phase", rename_all = "camelCase")]
enum Progress {
    // A copiar os ficheiros (bytes já na pasta de instalação)
    Copying { bytes: u64, total: u64 },
    // Tarefas finais (atalho, iniciar com o Windows, registar, terminar)
    Task { task: &'static str },
    Done,
    Error { message: String },
}

// Escolhas que o app lê na primeira vez que abre (e depois apaga)
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FirstRunPrefs<'a> {
    language: &'a str,
    start_with_windows: bool,
}

// O setup está em modo de demonstração (sem o app lá dentro)?
#[tauri::command]
fn setup_is_demo() -> bool {
    APP_INSTALLER.is_empty()
}

#[tauri::command]
async fn setup_install(app: AppHandle, request: InstallRequest) {
    thread::spawn(move || {
        let progress = |p: Progress| {
            let _ = app.emit(PROGRESS_EVENT, p);
        };
        match install(&app, &request, &progress) {
            Ok(()) => progress(Progress::Done),
            Err(message) => progress(Progress::Error { message }),
        }
    });
}

fn install(app: &AppHandle, request: &InstallRequest, progress: &dyn Fn(Progress)) -> Result<(), String> {
    let install_dir = PathBuf::from(&request.install_path);
    let total = APP_SIZE.and_then(|size| size.parse().ok()).unwrap_or(APP_SIZE_FALLBACK);

    // 1. Copiar o app: o instalador do Tauri corre escondido; a barra segue os bytes na pasta
    if APP_INSTALLER.is_empty() {
        simulate_copy(total, progress);
    } else {
        run_app_installer(&install_dir, total, progress)?;
    }

    // 2. Atalho no ambiente de trabalho (o instalador cria-o sempre; tira-se se não foi pedido)
    if request.desktop_shortcut {
        progress(Progress::Task { task: "desktopShortcut" });
        pause();
    } else if let Ok(desktop) = app.path().desktop_dir() {
        let _ = fs::remove_file(desktop.join(SHORTCUT_NAME));
    }

    // 3. Iniciar com o Windows (desligado: garante que não fica de uma instalação anterior)
    set_start_with_windows(request.start_with_windows, &install_dir.join(APP_EXE));
    if request.start_with_windows {
        progress(Progress::Task { task: "startWithWindows" });
        pause();
    }

    // 4. Registar as escolhas para o app (língua, iniciar com o Windows)
    progress(Progress::Task { task: "registering" });
    write_first_run_prefs(app, request);
    pause();

    progress(Progress::Task { task: "finishing" });
    pause();
    Ok(())
}

fn run_app_installer(install_dir: &Path, total: u64, progress: &dyn Fn(Progress)) -> Result<(), String> {
    let temp = std::env::temp_dir().join("AeroHub Connector Setup");
    fs::create_dir_all(&temp).map_err(|e| e.to_string())?;
    let installer = temp.join("aerohub-connector-installer.exe");
    fs::write(&installer, APP_INSTALLER).map_err(|e| e.to_string())?;

    let mut command = Command::new(&installer);
    command.arg("/S");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        // /D= tem de ser o último e sem aspas, mesmo com espaços (regra do NSIS)
        command.raw_arg(format!("/D={}", install_dir.display()));
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = command.spawn().map_err(|e| e.to_string())?;

    // Enquanto instala, mede o que já está na pasta
    let status = loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            break status;
        }
        progress(Progress::Copying { bytes: folder_size(install_dir).min(total), total });
        thread::sleep(Duration::from_millis(120));
    };
    let _ = fs::remove_file(&installer);

    if !status.success() {
        return Err(format!("installer exit code {:?}", status.code()));
    }
    if !install_dir.join(APP_EXE).exists() {
        return Err("app not found after install".into());
    }
    progress(Progress::Copying { bytes: total, total });
    Ok(())
}

// Modo de demonstração: barra a avançar durante ~3 s
fn simulate_copy(total: u64, progress: &dyn Fn(Progress)) {
    const STEPS: u64 = 25;
    for step in 0..=STEPS {
        progress(Progress::Copying { bytes: total * step / STEPS, total });
        thread::sleep(Duration::from_millis(120));
    }
}

fn pause() {
    thread::sleep(Duration::from_millis(450));
}

fn folder_size(dir: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(dir) else { return 0 };
    entries
        .flatten()
        .map(|entry| match entry.metadata() {
            Ok(meta) if meta.is_dir() => folder_size(&entry.path()),
            Ok(meta) => meta.len(),
            Err(_) => 0,
        })
        .sum()
}

fn write_first_run_prefs(app: &AppHandle, request: &InstallRequest) {
    let Ok(local) = app.path().local_data_dir() else { return };
    let dir = local.join(APP_DATA_FOLDER);
    let prefs = FirstRunPrefs {
        language: &request.language,
        start_with_windows: request.start_with_windows,
    };
    if fs::create_dir_all(&dir).is_ok() {
        if let Ok(json) = serde_json::to_string(&prefs) {
            let _ = fs::write(dir.join("installer-prefs.json"), json);
        }
    }
}

// Valor "AeroHub Connector" em HKCU\...\Run (o app usa o mesmo nome nas Definições)
fn set_start_with_windows(enabled: bool, exe: &Path) {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::System::Registry::{
            RegDeleteKeyValueW, RegSetKeyValueW, HKEY_CURRENT_USER, REG_SZ,
        };
        let wide = |s: &str| s.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
        let key = wide(r"Software\Microsoft\Windows\CurrentVersion\Run");
        let name = wide(RUN_VALUE_NAME);
        if enabled {
            let data = wide(&format!("\"{}\"", exe.display()));
            RegSetKeyValueW(
                HKEY_CURRENT_USER,
                key.as_ptr(),
                name.as_ptr(),
                REG_SZ,
                data.as_ptr() as *const _,
                (data.len() * 2) as u32,
            );
        } else {
            RegDeleteKeyValueW(HKEY_CURRENT_USER, key.as_ptr(), name.as_ptr());
        }
    }
    #[cfg(not(windows))]
    let _ = (enabled, exe, RUN_VALUE_NAME);
}

// Botão Finish com "Abrir o AeroHub Connector" marcado
#[tauri::command]
fn setup_launch_app(install_path: String) -> Result<(), String> {
    if APP_INSTALLER.is_empty() {
        return Ok(());
    }
    Command::new(Path::new(&install_path).join(APP_EXE))
        .current_dir(&install_path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![setup_is_demo, setup_install, setup_launch_app])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o AeroHub Connector Setup");
}
