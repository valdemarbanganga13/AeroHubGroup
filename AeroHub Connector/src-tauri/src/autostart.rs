// Definições → abrir o app sozinho com o computador:
// - Windows ("Iniciar com o Windows"): valor "AeroHub Connector" em
//   HKCU\Software\Microsoft\Windows\CurrentVersion\Run (o mesmo que o instalador escreve).
// - Mac ("Abrir ao iniciar sessão"): um LaunchAgent em ~/Library/LaunchAgents (a forma do macOS
//   de abrir um app quando a pessoa inicia sessão).
// Em `npm run tauri dev` não mexe em nada, para o computador não arrancar a versão de teste.

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const RUN_VALUE_NAME: &str = "AeroHub Connector";

#[tauri::command]
pub fn set_start_with_windows(enabled: bool) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Ok(());
    }
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::System::Registry::{
            RegDeleteKeyValueW, RegSetKeyValueW, HKEY_CURRENT_USER, REG_SZ,
        };
        let wide = |s: &str| s.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
        let key = wide(RUN_KEY);
        let name = wide(RUN_VALUE_NAME);
        if enabled {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
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
    #[cfg(target_os = "macos")]
    set_launch_agent(enabled)?;
    #[cfg(not(windows))]
    let _ = (enabled, RUN_KEY, RUN_VALUE_NAME);
    Ok(())
}

// Mac: ~/Library/LaunchAgents/com.aerohub.connector.plist abre o app ao iniciar sessão
// (compilado em todos os sistemas para ser verificado também no Windows; só é usado no Mac)
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
const LAUNCH_AGENT_LABEL: &str = "com.aerohub.connector";

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn set_launch_agent(enabled: bool) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let dir = std::path::Path::new(&home).join("Library").join("LaunchAgents");
    let file = dir.join(format!("{LAUNCH_AGENT_LABEL}.plist"));
    if !enabled {
        if file.exists() {
            std::fs::remove_file(&file).map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let escape = |s: &str| s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
    let plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
"#,
        escape(&exe.display().to_string())
    );
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(&file, plist).map_err(|e| e.to_string())
}
