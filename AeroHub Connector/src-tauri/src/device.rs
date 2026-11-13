// Nome deste computador. Aparece no site do Radar ao ligar o app à conta
// ("AeroHub Connector on DESKTOP-…"), para a pessoa saber que é o seu PC.
#[tauri::command]
pub fn device_name() -> String {
    // Mac: o nome que aparece em Definições › Geral › Partilha (ex.: "MacBook Pro do João")
    #[cfg(target_os = "macos")]
    if let Ok(output) = std::process::Command::new("scutil").args(["--get", "ComputerName"]).output() {
        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if output.status.success() && !name.is_empty() {
            return name;
        }
    }
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "this computer".into())
}
