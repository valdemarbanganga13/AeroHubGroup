// Primeira abertura depois de instalar com o AeroHub Connector Setup:
// o instalador deixa as escolhas (língua, iniciar com o Windows) num ficheiro na pasta de dados
// do app; o app lê-as uma vez e apaga o ficheiro.

use std::fs;
use tauri::{AppHandle, Manager};

const PREFS_FILE: &str = "installer-prefs.json";

#[tauri::command]
pub fn take_installer_prefs(app: AppHandle) -> Option<serde_json::Value> {
    let file = app.path().app_local_data_dir().ok()?.join(PREFS_FILE);
    let text = fs::read_to_string(&file).ok()?;
    let _ = fs::remove_file(&file);
    serde_json::from_str(&text).ok()
}
