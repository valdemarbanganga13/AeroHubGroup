// Esconde a consola extra do Windows nas versões finais
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod autostart;
mod device;
mod discord;
mod feeder;
mod feeder_uplink;
mod first_run;
mod flight_log;
mod occlusion;
mod pip;
mod sound;

use tauri::{Manager, WindowEvent};

fn main() {
    tauri::Builder::default()
        // Abre links (termos, privacidade) no browser do utilizador
        .plugin(tauri_plugin_opener::init())
        // Janela do Windows para escolher a pasta de instalação
        .plugin(tauri_plugin_dialog::init())
        // Atualizações: lê connector.aerohubradar.com/updates/latest.json, descarrega,
        // confirma a assinatura e instala; depois reabre o app
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Ligação ao Discord (Rich Presence)
        .manage(discord::DiscordState::default())
        // Feeder: ligação ao Infinite Flight (Connect API)
        .manage(feeder::FeederState::default())
        // Mini janela: passa a ouvir os avisos do Windows (minimizar, tapar, etc.)
        .setup(|app| {
            pip::install(app.handle());
            // Envio do voo do Feeder para o servidor do AeroHub Group
            feeder_uplink::install(app.handle().clone());
            // Voos gravados pelo Feeder (temporários: apagados 1 hora depois de o voo acabar)
            if let Ok(dir) = app.path().app_data_dir() {
                flight_log::init(dir);
            }
            Ok(())
        })
        // Ao fechar o app, sai de vez (a mini janela escondida não o deixa aberto)
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, WindowEvent::Destroyed) {
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            discord::discord_set_presence,
            discord::discord_clear_presence,
            // Mini janela (Picture-in-Picture)
            pip::pip_configure,
            pip::pip_show_and_minimize,
            pip::pip_open_app,
            pip::pip_dismiss,
            // Botão ▶ do "Som ao fixar"
            sound::play_pin_sound,
            // Escolhas do instalador (primeira abertura) e "Iniciar com o Windows"
            first_run::take_installer_prefs,
            autostart::set_start_with_windows,
            // Nome do PC, mostrado no site do Radar ao ligar o app à conta
            device::device_name,
            // Feeder (Infinite Flight Connect)
            feeder::feeder_start,
            feeder::feeder_stop,
            feeder::feeder_status,
            feeder::feeder_set_rate,
            feeder::feeder_set_callsign,
            feeder_uplink::feeder_set_session,
            // Página Armazenamento: voos gravados (ver e apagar)
            flight_log::storage_list,
            flight_log::storage_delete,
            flight_log::storage_delete_all
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o AeroHub Connector");
}
