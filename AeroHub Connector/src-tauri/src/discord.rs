// Discord Rich Presence: envia o status do voo para o app do Discord aberto neste computador.
// Não passa por servidores: fala diretamente com o Discord local (como os jogos fazem).

use std::sync::Mutex;

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;

// ID da aplicação no Discord Developer Portal. Vem do ficheiro .env (fora do git) na compilação.
const CLIENT_ID: Option<&str> = option_env!("DISCORD_CLIENT_ID");

// Nome da imagem carregada em Rich Presence → Art Assets
const LARGE_IMAGE: &str = "aerohub_logo";

#[derive(Default)]
pub struct DiscordState(Mutex<Option<DiscordIpcClient>>);

#[derive(Deserialize)]
pub struct PresenceButton {
    label: String,
    url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Presence {
    // Linha 1 (ex.: "LPPT → KJFK · Boeing 737-800") e o link ao clicar nela
    details: String,
    details_url: Option<String>,
    // Linha 2 (ex.: "Servidor Expert")
    state: String,
    // Descolagem e chegada prevista, em milissegundos (o Discord mostra o tempo restante)
    started_at: i64,
    ends_at: Option<i64>,
    // Texto ao passar o rato no logo e o link ao clicar nele
    large_text: String,
    large_url: Option<String>,
    // Imagem pequena (logo da companhia, por endereço na internet) e o texto dela
    small_image: Option<String>,
    small_text: Option<String>,
    // Até 2 botões (só os outros os veem)
    buttons: Vec<PresenceButton>,
}

fn build_activity(presence: &Presence) -> activity::Activity<'_> {
    let mut timestamps = activity::Timestamps::new().start(presence.started_at / 1000);
    if let Some(ends_at) = presence.ends_at {
        timestamps = timestamps.end(ends_at / 1000);
    }

    let mut assets = activity::Assets::new()
        .large_image(LARGE_IMAGE)
        .large_text(presence.large_text.as_str());
    if let Some(large_url) = presence.large_url.as_deref() {
        assets = assets.large_url(large_url);
    }
    if let Some(small_image) = presence.small_image.as_deref() {
        assets = assets.small_image(small_image);
        if let Some(small_text) = presence.small_text.as_deref() {
            assets = assets.small_text(small_text);
        }
    }

    let buttons = presence
        .buttons
        .iter()
        .take(2)
        .map(|button| activity::Button::new(button.label.as_str(), button.url.as_str()))
        .collect();

    let mut activity = activity::Activity::new()
        .activity_type(activity::ActivityType::Playing)
        // Na lista de membros dos servidores aparece a rota (linha 1) em vez do nome do jogo
        .status_display_type(activity::StatusDisplayType::Details)
        .details(presence.details.as_str())
        .state(presence.state.as_str())
        .timestamps(timestamps)
        .assets(assets)
        .buttons(buttons);
    if let Some(details_url) = presence.details_url.as_deref() {
        activity = activity.details_url(details_url);
    }
    activity
}

fn connect(client_id: &str) -> Result<DiscordIpcClient, String> {
    let mut client = DiscordIpcClient::new(client_id);
    client
        .connect()
        .map_err(|error| format!("Discord não está aberto ({error:?})"))?;
    Ok(client)
}

// Mostra (ou atualiza) o status no Discord. Se o Discord tiver sido fechado e aberto
// entretanto, volta a ligar sozinho.
#[tauri::command]
pub async fn discord_set_presence(
    state: tauri::State<'_, DiscordState>,
    presence: Presence,
) -> Result<(), String> {
    let client_id = CLIENT_ID
        .filter(|id| !id.is_empty())
        .ok_or("DISCORD_CLIENT_ID não está definido no ficheiro .env")?;
    let mut guard = state.0.lock().map_err(|_| "Erro interno do Discord")?;

    if let Some(client) = guard.as_mut() {
        if client.set_activity(build_activity(&presence)).is_ok() {
            #[cfg(debug_assertions)]
            eprintln!("[discord] status enviado: {:?} / {:?}", presence.details, presence.state);
            return Ok(());
        }
        // A ligação caiu (ex.: o Discord fechou): tenta ligar de novo
        let _ = client.close();
        *guard = None;
    }

    let mut client = connect(client_id)?;
    client
        .set_activity(build_activity(&presence))
        .map_err(|error| format!("Não foi possível mostrar o status ({error:?})"))?;
    #[cfg(debug_assertions)]
    eprintln!("[discord] ligado e status enviado: {:?} / {:?}", presence.details, presence.state);
    *guard = Some(client);
    Ok(())
}

// Tira o status do Discord (ex.: ao terminar sessão)
#[tauri::command]
pub async fn discord_clear_presence(state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|_| "Erro interno do Discord")?;
    if let Some(client) = guard.as_mut() {
        let _ = client.clear_activity();
        #[cfg(debug_assertions)]
        eprintln!("[discord] status apagado");
    }
    Ok(())
}
