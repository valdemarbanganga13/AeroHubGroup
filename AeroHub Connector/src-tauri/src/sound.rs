// Sons da mini janela (Definições → "Som ao fixar").
// Tocam pelo sistema de som do computador, e não pela parte visual do app: assim não há
// bloqueio de "som sem clique" e funcionam com o app minimizado ou tapado.
// - Windows: PlaySound, direto da memória.
// - Mac: afplay (o leitor de som do macOS), a partir de uma cópia na pasta temporária.
// Os ficheiros ficam dentro do próprio app (pasta src-tauri/sounds).

const PLIM: &[u8] = include_bytes!("../sounds/pin-plim.wav");
const DROP: &[u8] = include_bytes!("../sounds/pin-drop.wav");
const MARIMBA: &[u8] = include_bytes!("../sounds/pin-marimba.wav");
const KALIMBA: &[u8] = include_bytes!("../sounds/pin-kalimba.wav");
const WOOD: &[u8] = include_bytes!("../sounds/pin-wood.wav");

// Botão ▶ nas Definições
#[tauri::command]
pub fn play_pin_sound(sound: String) {
    play(&sound);
}

pub fn play(sound: &str) {
    let bytes = match sound {
        "plim" => PLIM,
        "drop" => DROP,
        "marimba" => MARIMBA,
        "kalimba" => KALIMBA,
        "wood" => WOOD,
        // "off" ou desconhecido: sem som
        _ => return,
    };

    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::Media::Audio::{PlaySoundW, SND_ASYNC, SND_MEMORY, SND_NODEFAULT};
        // Toca em segundo plano; um som novo substitui o anterior se ainda estiver a tocar
        PlaySoundW(
            bytes.as_ptr() as *const u16,
            std::ptr::null_mut(),
            SND_MEMORY | SND_ASYNC | SND_NODEFAULT,
        );
    }
    #[cfg(target_os = "macos")]
    play_with_afplay(sound, bytes);
    #[cfg(not(windows))]
    let _ = bytes;
}

// Mac: grava o som na pasta temporária (uma vez) e toca-o com o afplay, sem esperar que acabe
// (compilado em todos os sistemas para ser verificado também no Windows; só é usado no Mac)
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn play_with_afplay(name: &str, bytes: &[u8]) {
    let file = std::env::temp_dir().join(format!("aerohub-connector-pin-{name}.wav"));
    let up_to_date = std::fs::metadata(&file).map(|m| m.len() == bytes.len() as u64).unwrap_or(false);
    if !up_to_date && std::fs::write(&file, bytes).is_err() {
        return;
    }
    let _ = std::process::Command::new("/usr/bin/afplay").arg(&file).spawn();
}
