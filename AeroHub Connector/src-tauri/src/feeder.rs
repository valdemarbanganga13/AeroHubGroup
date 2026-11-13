// Feeder: liga o app ao Infinite Flight pela Connect API v2 e lê a posição do avião.
//
// Como funciona (documentação: github.com/infiniteflight/infiniteflight-api):
// 1. Automático: o Infinite Flight anuncia-se na rede Wi-Fi (UDP, porta 15000) com o IP e o nome do aparelho.
//    Manual: usa o IP escrito no app.
// 2. Liga por TCP à porta 10112 desse IP.
// 3. Pede a lista dos dados (manifest: envia -1 e false) e guarda o número (ID) de cada dado que interessa.
// 4. Plano de voo de 30 em 30 s, destino e tempo que falta de 10 em 10 s; o resto de 1 a 10 vezes por segundo (escolha da pessoa) pede esses dados (envia ID e false) e manda-os para a janela (evento "feeder://data").
// Tudo em little-endian (int32 de 4 bytes, bool de 1 byte; textos: tamanho int32 + bytes).
// Se a ligação cair, volta a procurar sozinho até se carregar em "Desligar".
//
// Radar: num voo num servidor Live, os dados vão para o servidor do AeroHub Group (feeder_uplink.rs).
//
// Só o dono da conta: depois de ligar, lê o utilizador com sessão iniciada no Infinite Flight
// (infiniteflight/current_user) e compara com o nome do Infinite Flight ligado à conta do AeroHub Radar.
// Se for outra pessoa (ex.: várias pessoas a jogar na mesma casa), desliga desse aparelho, ignora-o durante
// 30 segundos e continua à procura do aparelho certo. Volta a confirmar de 10 em 10 segundos
// (se alguém trocar de conta no jogo a meio, a ligação cai).

use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::feeder_uplink;
use crate::flight_log::FlightLog;

const DISCOVERY_PORT: u16 = 15000;
const API_PORT: u16 = 10112;
// Quantas vezes por segundo se leem os dados (escolha da pessoa no app, de 1 a 10)
static UPDATES_PER_SECOND: AtomicU64 = AtomicU64::new(4);
const RETRY_AFTER: Duration = Duration::from_secs(2);

// O que quase nunca muda (o plano de voo, a pintura, o número do voo): lido de 30 em 30 segundos.
// Mudar um ponto do plano no jogo aparece no Radar em 30 s, no máximo.
// O full_info não se usa: são dezenas de milhares de caracteres e o formato muda entre versões do jogo.
const RARE: &[(&str, &str)] = &[
    // Partida: o 1.º ponto do plano (lista "LPMA,RW23,…,LPPT"). O origin_airport do jogo é o aeroporto mais
    // próximo de onde o avião está, não a partida do plano: só se usa se não houver plano (ver track)
    ("aircraft/0/flightplan", "planRoute"),
    ("aircraft/0/flightplan/origin_airport", "planOrigin"),
    // Pontos do plano ("lat,lon lat,lon …"): para saber o comprimento total e calcular o progresso
    ("aircraft/0/flightplan/coordinates", "planCoordinates"),
    // Nomes dos pontos do plano, pela mesma ordem das coordenadas: para o Radar desenhar a rota do plano
    ("aircraft/0/flightplan/route", "planNames"),
    // Pintura (ID da tabela do AeroHub Radar: tipo, categoria, matrícula…) e número do voo (desvios)
    ("aircraft/0/livery_id", "liveryId"),
    ("infiniteflight/live/current_flight/id", "flightId"),
];
const RARE_EVERY: Duration = Duration::from_secs(30);

// O que muda devagar: lido de 10 em 10 segundos. O destino fica aqui (e não no de 30 s) para o desvio
// ser visto em 10 s; minutos e milhas náuticas até ao destino mudam sempre, mas devagar.
const SLOW: &[(&str, &str)] = &[
    ("aircraft/0/flightplan/destination_waypoint_name", "planDestination"),
    ("aircraft/0/flightplan/destination_ete", "destinationEte"),
    ("aircraft/0/flightplan/destination_dist", "destinationDist"),
];
const SLOW_EVERY: Duration = Duration::from_secs(10);
// Desvio: de 10 em 10 s (o ritmo a que o plano é lido) compara o destino do plano com o original (ver Diversion)
const DIVERSION_EVERY: Duration = Duration::from_secs(10);
// O ficheiro do voo é temporário: mais velho do que isto (sem voo a atualizá-lo) é apagado e ignorado
const FLIGHT_FILE_MAX_AGE: Duration = Duration::from_secs(60 * 60);

// A lista dos dados também se relê de 30 em 30 s, por segurança
const MANIFEST_EVERY: Duration = Duration::from_secs(30);
const CURRENT_USER: &str = "infiniteflight/current_user";

// Indicativo (callsign) do voo, que a janela pergunta UMA vez por voo ao servidor do AeroHub Radar
// (a Connect API não o dá): (número do voo, indicativo). Passa para o ficheiro do voo (ver Diversion).
static FLIGHT_CALLSIGN: Mutex<Option<(String, String)>> = Mutex::new(None);

// Aparelho de outra pessoa: não se volta a tentar durante este tempo
const IGNORE_OTHERS_FOR: Duration = Duration::from_secs(30);
// Erro enviado para a janela quando o aparelho encontrado é de outra pessoa: "wrong_user:<nome>"
const WRONG_USER: &str = "wrong_user:";

// Dados lidos em cada volta (caminho na API → nome enviado para a janela)
const WANTED: &[(&str, &str)] = &[
    ("aircraft/0/latitude", "latitude"),
    ("aircraft/0/longitude", "longitude"),
    ("aircraft/0/altitude_msl", "altitudeMsl"),
    ("aircraft/0/altitude_agl", "altitudeAgl"),
    ("aircraft/0/heading_true", "headingTrue"),
    ("aircraft/0/groundspeed", "groundSpeed"),
    ("aircraft/0/indicated_airspeed", "indicatedAirspeed"),
    ("aircraft/0/true_airspeed", "trueAirspeed"),
    ("aircraft/0/mach_speed", "mach"),
    // Temperatura lá fora (°C) e vento em relação ao nariz (m/s): de frente (+) e de lado (+ = da direita)
    ("aircraft/0/oat", "oat"),
    ("aircraft/0/headwind_component", "headwind"),
    ("aircraft/0/crosswind_component", "crosswind"),
    // Vento do próprio jogo onde está o avião (direto, sem contas a partir do nariz — que atrasavam nas curvas):
    // de onde vem (radianos, norte verdadeiro) e velocidade (m/s). Não estão na documentação; estão no manifesto.
    ("environment/wind_direction_true", "windFromTrue"),
    ("environment/wind_velocity", "windSpeed"),
    ("aircraft/0/vertical_speed", "verticalSpeed"),
    // Inclinação do avião (radianos), para o 3D do Radar: curvas e voar de cabeça para baixo
    ("aircraft/0/pitch", "pitch"),
    ("aircraft/0/bank", "bank"),
    ("aircraft/0/is_on_ground", "onGround"),
    ("aircraft/0/name", "aircraft"),
    ("aircraft/0/livery", "livery"),
    ("infiniteflight/app_state", "appState"),
    ("infiniteflight/live/current_server/name", "server"),
];

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FeederStatus {
    // "off" | "searching" | "connected"
    state: String,
    device: Option<String>,
    address: Option<String>,
    error: Option<String>,
}

#[derive(Default)]
pub struct FeederState {
    stop: Mutex<Option<Arc<AtomicBool>>>,
    status: Arc<Mutex<FeederStatus>>,
}

fn set_status(app: &AppHandle, shared: &Mutex<FeederStatus>, status: FeederStatus) {
    // Sem ligação ao jogo: o voo sai do mapa
    if status.state != "connected" {
        feeder_uplink::flight_ended();
    }
    *shared.lock().unwrap() = status.clone();
    let _ = app.emit("feeder://status", status);
}

// Depois de "Desligar", a ligação antiga já não muda o estado
fn set_status_unless_stopped(app: &AppHandle, shared: &Mutex<FeederStatus>, stop: &AtomicBool, status: FeederStatus) {
    if !stop.load(Ordering::SeqCst) {
        set_status(app, shared, status);
    }
}

#[tauri::command]
pub fn feeder_start(
    app: AppHandle,
    state: State<FeederState>,
    mode: String,
    ip: Option<String>,
    expected_user: String,
) -> Result<(), String> {
    // Sem o nome do Infinite Flight da conta não há como saber quem é o dono: não liga
    let owner = normalize_user(&expected_user);
    if owner.is_empty() {
        return Err("no_ifc_user".into());
    }
    let manual = if mode == "manual" {
        let text = ip.unwrap_or_default();
        Some(text.trim().parse::<IpAddr>().map_err(|_| "invalid IP address".to_string())?)
    } else {
        None
    };

    // Se já estava a correr, pára o anterior
    if let Some(old) = state.stop.lock().unwrap().take() {
        old.store(true, Ordering::SeqCst);
    }
    let stop = Arc::new(AtomicBool::new(false));
    *state.stop.lock().unwrap() = Some(stop.clone());
    let shared = state.status.clone();
    feeder_uplink::unblock();

    thread::spawn(move || run(app, shared, stop, manual, owner));
    Ok(())
}

#[tauri::command]
pub fn feeder_stop(app: AppHandle, state: State<FeederState>) {
    if let Some(stop) = state.stop.lock().unwrap().take() {
        stop.store(true, Ordering::SeqCst);
    }
    set_status(&app, &state.status, FeederStatus { state: "off".into(), ..Default::default() });
}

// A janela recebeu o indicativo deste voo: fica para o resto do voo
#[tauri::command]
pub fn feeder_set_callsign(flight_id: String, callsign: String) {
    let callsign = callsign.trim().to_string();
    if !callsign.is_empty() {
        *FLIGHT_CALLSIGN.lock().unwrap() = Some((flight_id.trim().to_uppercase(), callsign));
    }
}

// Muda o ritmo na hora, mesmo com a ligação já aberta
#[tauri::command]
pub fn feeder_set_rate(per_second: u64) {
    UPDATES_PER_SECOND.store(per_second.clamp(1, 10), Ordering::SeqCst);
}

// Estado atual (para a página Feeder ao abrir, mesmo que a ligação tenha começado antes)
#[tauri::command]
pub fn feeder_status(state: State<FeederState>) -> FeederStatus {
    let status = state.status.lock().unwrap().clone();
    if status.state.is_empty() {
        FeederStatus { state: "off".into(), ..Default::default() }
    } else {
        status
    }
}

// Desvio do voo. O destino original é o do plano quando o avião descola (antes disso, no chão,
// mudar o plano é normal e só atualiza o original). Já no ar, se o destino do plano passar a ser outro
// aeroporto (ICAO de 4 letras), o voo foi desviado para lá; se voltar ao original, deixa de estar.
// Plano apagado ou sem aeroporto no fim: não muda nada. É o MESMO voo (continua a contar o tempo);
// só começa do zero com um voo novo no jogo (outro número de voo). Fica guardado entre ligações e
// também em disco (feeder-flight.json na pasta do app), para o app fechar e abrir a meio do voo sem esquecer.
// Esse ficheiro é só temporário: apaga-se quando a pessoa sai do voo (o jogo deixa de estar a jogar) e,
// se ficar mais de 1 hora sem ser atualizado (ex.: o app fechou e nunca mais voou), é apagado e ignorado.
// Enquanto voa, é atualizado a cada verificação.
#[derive(Default)]
struct Diversion {
    file: Option<PathBuf>,
    flight_id: Option<String>,
    airborne: bool,
    original: Option<String>,
    diverted_to: Option<String>,
    checked_at: Option<Instant>,
    // Indicativo do voo (o único dado da Live API guardado, e só enquanto o voo durar)
    callsign: Option<String>,
    // Já esteve no chão neste voo (para saber a hora da descolagem), descolagem e aterragem (ms desde 1970)
    seen_ground: bool,
    took_off_at: Option<u64>,
    landed_at: Option<u64>,
    // Último plano de voo conhecido. O Infinite Flight apaga o plano quando o avião aterra: o voo continua
    // a mostrar o plano que tinha (só muda se a pessoa puser outro plano).
    plan: Option<(Value, Value, Value, Value)>,
    // Partida do voo: a primeira conhecida (do plano) fica até ao fim do voo; não muda ao reconectar
    origin: Option<String>,
    // Pernas do mesmo voo do jogo: aterrou e pôs outro plano ainda no chão (ex.: GRU→GIG e depois GIG→VIX)
    // = voo novo (0, 1, 2…), com partida, destino, horas e gravação novos. Não é um desvio.
    leg: u32,
}

impl Diversion {
    fn update(&mut self, data: &Map<String, Value>) {
        let text = |key: &str| data.get(key).and_then(Value::as_str).unwrap_or("").trim().to_uppercase();
        let flight_id = text("flightId");
        if !flight_id.is_empty() && self.flight_id.as_deref() != Some(flight_id.as_str()) {
            let file = self.file.take();
            *self = Diversion { file, flight_id: Some(flight_id), ..Default::default() };
            self.load();
        }
        // Saiu do voo (menu do jogo): esquece tudo e apaga o ficheiro
        let app_state = data.get("appState").and_then(Value::as_str).unwrap_or("").to_lowercase();
        if !app_state.is_empty() && !app_state.contains("play") && !app_state.contains("pause") {
            if self.original.is_some() || self.callsign.is_some() {
                let file = self.file.take();
                *self = Diversion { file, ..Default::default() };
                self.delete();
                *FLIGHT_CALLSIGN.lock().unwrap() = None;
            }
            return;
        }
        // Indicativo que a janela acabou de receber para este voo (também corrige um guardado errado)
        let given = FLIGHT_CALLSIGN.lock().unwrap().clone();
        if let Some((id, callsign)) = given {
            if self.flight_id.as_deref() == Some(id.as_str()) && self.callsign.as_deref() != Some(callsign.as_str()) {
                self.callsign = Some(callsign);
                self.save();
            }
        }
        let on_ground = data.get("onGround").and_then(Value::as_bool).unwrap_or(true);
        if !on_ground {
            self.airborne = true;
        }
        if self.checked_at.is_some_and(|at| at.elapsed() < DIVERSION_EVERY) && self.original.is_some() {
            return;
        }
        self.checked_at = Some(Instant::now());
        let dest = text("planDestination");
        let is_airport = dest.len() == 4 && dest.chars().all(|c| c.is_ascii_alphanumeric());
        if !is_airport {
            return;
        }
        #[cfg(debug_assertions)]
        eprintln!(
            "[desvio] destino do plano {dest} | original {:?} | no ar {} | desviado {:?}",
            self.original, self.airborne, self.diverted_to
        );
        if !self.airborne || self.original.is_none() {
            self.original = Some(dest);
            self.diverted_to = None;
        } else if self.original.as_deref() == Some(dest.as_str()) {
            self.diverted_to = None;
        } else {
            self.diverted_to = Some(dest);
        }
        // Guarda sempre (a hora no ficheiro mostra que o voo continua ativo)
        self.save();
    }

    // Mesmo voo guardado em disco? Recupera o destino original, o desvio e se já descolou
    fn load(&mut self) {
        let Some(file) = &self.file else { return };
        let Ok(text) = std::fs::read_to_string(file) else { return };
        let Ok(saved) = serde_json::from_str::<Value>(&text) else { return };
        let saved_at = saved.get("savedAt").and_then(Value::as_u64).unwrap_or(0);
        if now_secs().saturating_sub(saved_at) > FLIGHT_FILE_MAX_AGE.as_secs() {
            self.delete();
            return;
        }
        if saved.get("flightId").and_then(Value::as_str) != self.flight_id.as_deref() {
            return;
        }
        let get = |key: &str| saved.get(key).and_then(Value::as_str).map(str::to_string);
        self.original = get("original");
        self.diverted_to = get("divertedTo");
        self.callsign = get("callsign");
        self.origin = get("origin");
        self.leg = saved.get("leg").and_then(Value::as_u64).unwrap_or(0) as u32;
        self.took_off_at = saved.get("tookOffAt").and_then(Value::as_u64);
        self.landed_at = saved.get("landedAt").and_then(Value::as_u64);
        self.airborne = saved.get("airborne").and_then(Value::as_bool).unwrap_or(false);
    }

    fn delete(&self) {
        if let Some(file) = &self.file {
            let _ = std::fs::remove_file(file);
        }
    }

    fn save(&self) {
        let Some(file) = &self.file else { return };
        let saved = serde_json::json!({
            "flightId": self.flight_id,
            "original": self.original,
            "divertedTo": self.diverted_to,
            "airborne": self.airborne,
            "callsign": self.callsign,
            "origin": self.origin,
            "leg": self.leg,
            "tookOffAt": self.took_off_at,
            "landedAt": self.landed_at,
            "savedAt": now_secs(),
        });
        if let Some(dir) = file.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(file, saved.to_string());
    }

    // Corre em todas as voltas (antes de update): descolagem/aterragem e o plano guardado
    fn track(&mut self, data: &mut Map<String, Value>) {
        let on_ground = data.get("onGround").and_then(Value::as_bool);
        let now_ms = now_secs() * 1000;
        match on_ground {
            Some(true) => {
                // Aterrou (estava no ar): fica a hora da chegada
                if self.airborne && self.landed_at.is_none() && !self.seen_ground {
                    self.landed_at = Some(now_ms);
                    self.save();
                }
                self.seen_ground = true;
            }
            Some(false) => {
                // Descolou à frente do app (estava no chão neste voo)
                if self.seen_ground && (self.took_off_at.is_none() || self.landed_at.is_some()) {
                    self.took_off_at = Some(now_ms);
                    self.landed_at = None;
                    self.save();
                }
                self.seen_ground = false;
            }
            None => {}
        }

        let is_icao = |code: &str| code.len() == 4 && code.chars().all(|c| c.is_ascii_alphanumeric());
        let route = data.get("planRoute").and_then(Value::as_str).unwrap_or("");
        let first = route.split(',').next().unwrap_or("").trim().to_uppercase();

        // Já aterrou, está no chão e pôs outro plano (destino ou partida diferentes): é um voo NOVO, não um desvio.
        // Ex.: GRU→GIG, aterra no GIG e põe GIG→VIX. Desvio é só mudar o destino depois de descolar e antes de aterrar.
        // (O plano que o jogo apaga ao aterrar não conta: só um plano com aeroporto no fim.)
        if on_ground == Some(true) && self.landed_at.is_some() {
            let dest = data.get("planDestination").and_then(Value::as_str).unwrap_or("").trim().to_uppercase();
            let shown_dest = self.diverted_to.as_ref().or(self.original.as_ref());
            let new_dest = is_icao(&dest) && shown_dest.is_some_and(|d| *d != dest);
            let new_origin = is_icao(&first) && self.origin.as_ref().is_some_and(|o| *o != first);
            if new_dest || new_origin {
                #[cfg(debug_assertions)]
                eprintln!("[desvio] aterrou e pôs outro plano ({first} → {dest}): voo novo, não é desvio");
                self.new_leg();
            }
        }

        // Partida: o 1.º ponto do plano se for um aeroporto (4 letras); fica fixa para o resto do voo.
        // Sem plano e ainda no chão (antes de descolar), o aeroporto onde está serve de partida.
        if self.origin.is_none() {
            let here = data.get("planOrigin").and_then(Value::as_str).unwrap_or("").trim().to_uppercase();
            if is_icao(&first) {
                self.origin = Some(first);
                self.save();
            } else if !self.airborne && on_ground == Some(true) && is_icao(&here) {
                self.origin = Some(here);
                self.save();
            }
        }
        match &self.origin {
            Some(origin) => {
                data.insert("planOrigin".into(), Value::from(origin.clone()));
            }
            // Partida desconhecida (ligou já no ar, sem plano): melhor nada do que o aeroporto mais próximo
            None => {
                data.insert("planOrigin".into(), Value::Null);
            }
        }
        data.remove("planRoute");

        // Plano: guarda o último com aeroporto de destino; plano apagado → volta a pôr o guardado
        let text = |key: &str| data.get(key).and_then(Value::as_str).unwrap_or("").trim().to_string();
        let dest = text("planDestination");
        if dest.len() == 4 && dest.chars().all(|c| c.is_ascii_alphanumeric()) {
            self.plan = Some((
                data.get("planOrigin").cloned().unwrap_or(Value::Null),
                data.get("planDestination").cloned().unwrap_or(Value::Null),
                data.get("planCoordinates").cloned().unwrap_or(Value::Null),
                data.get("planNames").cloned().unwrap_or(Value::Null),
            ));
        } else if let Some((origin, destination, coordinates, names)) = &self.plan {
            data.insert("planOrigin".into(), origin.clone());
            data.insert("planDestination".into(), destination.clone());
            data.insert("planCoordinates".into(), coordinates.clone());
            data.insert("planNames".into(), names.clone());
            data.insert("planKept".into(), Value::Bool(true));
        }
    }

    // Voo novo no mesmo voo do jogo (ver leg): começa tudo do zero menos o indicativo
    fn new_leg(&mut self) {
        self.leg += 1;
        self.airborne = false;
        self.original = None;
        self.diverted_to = None;
        self.took_off_at = None;
        self.landed_at = None;
        self.origin = None;
        self.plan = None;
        self.checked_at = None;
        self.save();
    }

    fn write(&self, data: &mut Map<String, Value>) {
        // Chave do voo (número do jogo + perna): a gravação e o mapa começam do zero a cada voo novo
        let id = data.get("flightId").and_then(Value::as_str).unwrap_or("").to_string();
        let key = if self.leg > 0 && !id.is_empty() { format!("{id}-leg{}", self.leg) } else { id };
        data.insert("flightKey".into(), Value::from(key));
        data.insert("takeoffAt".into(), self.took_off_at.map_or(Value::Null, Value::from));
        data.insert("landedAt".into(), self.landed_at.map_or(Value::Null, Value::from));
        data.insert("originalDestination".into(), self.original.clone().map_or(Value::Null, Value::from));
        data.insert("divertedTo".into(), self.diverted_to.clone().map_or(Value::Null, Value::from));
        data.insert("callsign".into(), self.callsign.clone().map_or(Value::Null, Value::from));
    }
}

fn now_secs() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_secs())
}

// Nomes do Infinite Flight comparados sem maiúsculas e sem espaços à volta
fn normalize_user(name: &str) -> String {
    name.trim().to_lowercase()
}

fn run(app: AppHandle, shared: Arc<Mutex<FeederStatus>>, stop: Arc<AtomicBool>, manual: Option<IpAddr>, owner: String) {
    let mut last_error: Option<String> = None;
    // Aparelhos de outras pessoas e quando foram encontrados
    let mut others: HashMap<IpAddr, Instant> = HashMap::new();
    let mut diversion = Diversion {
        file: app.path().app_data_dir().ok().map(|dir| dir.join("feeder-flight.json")),
        ..Default::default()
    };
    // Gravação do voo (fica entre ligações: depois de uma falha, o mesmo voo continua no mesmo ficheiro)
    let mut log = FlightLog::default();
    while !stop.load(Ordering::SeqCst) {
        let searching = FeederStatus { state: "searching".into(), error: last_error.clone(), ..Default::default() };
        set_status_unless_stopped(&app, &shared, &stop, searching);

        others.retain(|_, at| at.elapsed() < IGNORE_OTHERS_FOR);
        let found = match manual {
            Some(ip) => Some((ip, None)),
            None => discover(&stop, &others),
        };
        let Some((ip, device)) = found else { continue };
        if stop.load(Ordering::SeqCst) {
            break;
        }

        match session(&app, &shared, &stop, ip, device, &owner, &mut diversion, &mut log) {
            Ok(()) => break, // parou porque se carregou em "Desligar"
            Err(error) => {
                if error.starts_with(WRONG_USER) {
                    others.insert(ip, Instant::now());
                }
                last_error = Some(error);
                sleep_unless_stopped(&stop, RETRY_AFTER);
            }
        }
    }
}

fn sleep_unless_stopped(stop: &AtomicBool, total: Duration) {
    let step = Duration::from_millis(100);
    let mut waited = Duration::ZERO;
    while waited < total && !stop.load(Ordering::SeqCst) {
        let nap = step.min(total - waited);
        thread::sleep(nap);
        waited += nap;
    }
}

// Ouve o anúncio do Infinite Flight na rede. Devolve o IP e o nome do aparelho (ou None se nada chegou).
// Os aparelhos de outras pessoas (others) são ignorados, para encontrar o do dono da conta.
fn discover(stop: &AtomicBool, others: &HashMap<IpAddr, Instant>) -> Option<(IpAddr, Option<String>)> {
    let socket = match UdpSocket::bind(("0.0.0.0", DISCOVERY_PORT)) {
        Ok(socket) => socket,
        Err(_) => {
            sleep_unless_stopped(stop, RETRY_AFTER);
            return None;
        }
    };
    socket.set_read_timeout(Some(Duration::from_millis(1000))).ok()?;
    let mut buf = [0u8; 4096];
    // Até 5 segundos sem anúncios (ou só com os de outras pessoas)
    let waiting = Instant::now();
    while waiting.elapsed() < Duration::from_secs(5) {
        if stop.load(Ordering::SeqCst) {
            return None;
        }
        if let Ok((len, from)) = socket.recv_from(&mut buf) {
            let info: Value = serde_json::from_slice(&buf[..len]).unwrap_or(Value::Null);
            let device = info.get("DeviceName").and_then(Value::as_str).map(str::to_string);
            // O IP de onde veio o anúncio é o do aparelho; se o anúncio trouxer um IPv4, usa esse
            let ip = info
                .get("Addresses")
                .and_then(Value::as_array)
                .and_then(|list| {
                    list.iter()
                        .filter_map(Value::as_str)
                        .filter_map(|a| a.parse::<IpAddr>().ok())
                        .find(|a| a.is_ipv4())
                })
                .unwrap_or(from.ip());
            if others.contains_key(&ip) || others.contains_key(&from.ip()) {
                continue;
            }
            return Some((ip, device));
        }
    }
    None
}

// Uma ligação ao Infinite Flight. Ok = parou porque se carregou em "Desligar"; Err = a ligação caiu.
fn session(
    app: &AppHandle,
    shared: &Mutex<FeederStatus>,
    stop: &AtomicBool,
    ip: IpAddr,
    device: Option<String>,
    owner: &str,
    diversion: &mut Diversion,
    log: &mut FlightLog,
) -> Result<(), String> {
    let address = SocketAddr::new(ip, API_PORT);
    let mut stream =
        TcpStream::connect_timeout(&address, Duration::from_secs(3)).map_err(|e| format!("connect: {e}"))?;
    stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
    stream.set_nodelay(true).ok();

    let mut manifest = read_manifest(&mut stream)?;
    let mut manifest_at = Instant::now();
    // Avião e estado do jogo da volta anterior: se mudarem, a lista dos dados (IDs) é lida de novo
    let mut last_scene: Option<(Value, Value)> = None;
    check_owner(&mut stream, &manifest, owner)?;
    set_status_unless_stopped(
        app,
        shared,
        stop,
        FeederStatus {
            state: "connected".into(),
            device,
            address: Some(ip.to_string()),
            error: None,
        },
    );

    // Últimos valores lidos devagar (vão em todas as voltas; só se pedem de novo de 10 em 10 s / 30 em 30 s)
    let mut slow = Map::new();
    let mut slow_at: Option<Instant> = None;
    let mut rare_at: Option<Instant> = None;

    while !stop.load(Ordering::SeqCst) {
        let started = Instant::now();
        if slow_at.map_or(true, |at| at.elapsed() >= SLOW_EVERY) {
            // Ainda é o dono da conta? (alguém pode ter trocado de conta no jogo)
            if slow_at.is_some() {
                check_owner(&mut stream, &manifest, owner)?;
            }
            for (path, key) in SLOW {
                if let Some(&(id, kind)) = manifest.get(*path) {
                    slow.insert((*key).to_string(), get_state(&mut stream, id, kind)?);
                }
            }
            slow_at = Some(Instant::now());
        }
        if rare_at.map_or(true, |at| at.elapsed() >= RARE_EVERY) {
            for (path, key) in RARE {
                if let Some(&(id, kind)) = manifest.get(*path) {
                    slow.insert((*key).to_string(), get_state(&mut stream, id, kind)?);
                }
            }
            rare_at = Some(Instant::now());
        }
        let mut data = slow.clone();
        for (path, key) in WANTED {
            if let Some(&(id, kind)) = manifest.get(*path) {
                data.insert((*key).to_string(), get_state(&mut stream, id, kind)?);
            }
        }
        // Cada avião tem a sua lista de dados (os IDs mudam). Mudou de avião, saiu do voo ou voltou
        // (estado do jogo), ou passaram 30 s: lê a lista de novo e não envia os dados desta volta
        let scene = (
            data.get("aircraft").cloned().unwrap_or(Value::Null),
            data.get("appState").cloned().unwrap_or(Value::Null),
        );
        let changed = last_scene.as_ref().is_some_and(|previous| *previous != scene);
        last_scene = Some(scene);
        if changed || manifest_at.elapsed() >= MANIFEST_EVERY {
            manifest = read_manifest(&mut stream)?;
            manifest_at = Instant::now();
            if changed {
                slow.clear();
                slow_at = None;
                rare_at = None;
                last_scene = None;
                continue;
            }
        }
        // Desvio (destino original e para onde foi desviado)
        diversion.track(&mut data);
        diversion.update(&data);
        diversion.write(&mut data);
        // Playback, rastro e gráficos: 1 ponto por segundo no ficheiro temporário do voo
        log.record(&data);
        // Radar: vai para o servidor (só num voo num servidor Live)
        feeder_uplink::publish(&data);
        let _ = app.emit("feeder://data", Value::Object(data));
        // Espera o resto do intervalo (o tempo dos pedidos já conta)
        let every = Duration::from_millis(1000 / UPDATES_PER_SECOND.load(Ordering::SeqCst).max(1));
        sleep_unless_stopped(stop, every.saturating_sub(started.elapsed()));
    }
    Ok(())
}

// Lê quem tem sessão iniciada no Infinite Flight deste aparelho e confirma que é o dono da conta
// (devolve o nome como o jogo o escreve)
fn check_owner(stream: &mut TcpStream, manifest: &HashMap<String, (i32, i32)>, owner: &str) -> Result<String, String> {
    let &(id, kind) = manifest.get(CURRENT_USER).ok_or("no current_user in manifest")?;
    let user = match get_state(stream, id, kind)? {
        Value::String(name) => name,
        _ => String::new(),
    };
    if normalize_user(&user) == owner {
        Ok(user.trim().to_string())
    } else {
        Err(format!("{WRONG_USER}{}", user.trim()))
    }
}

fn send_request(stream: &mut TcpStream, id: i32) -> Result<(), String> {
    let mut msg = id.to_le_bytes().to_vec();
    msg.push(0); // false = ler (não mudar)
    stream.write_all(&msg).map_err(|e| format!("send: {e}"))
}

fn read_i32(stream: &mut TcpStream) -> Result<i32, String> {
    let mut b = [0u8; 4];
    stream.read_exact(&mut b).map_err(|e| format!("read: {e}"))?;
    Ok(i32::from_le_bytes(b))
}

fn read_bytes(stream: &mut TcpStream, len: usize) -> Result<Vec<u8>, String> {
    let mut b = vec![0u8; len];
    stream.read_exact(&mut b).map_err(|e| format!("read: {e}"))?;
    Ok(b)
}

// Lista "ID,Tipo,Caminho" (uma por linha) → caminho → (ID, tipo)
fn read_manifest(stream: &mut TcpStream) -> Result<HashMap<String, (i32, i32)>, String> {
    send_request(stream, -1)?;
    let _id = read_i32(stream)?;
    let len = read_i32(stream)?;
    let body = read_bytes(stream, len.max(0) as usize)?;
    let text = String::from_utf8_lossy(body.get(4..).unwrap_or_default());
    let mut map = HashMap::new();
    for line in text.lines() {
        let mut parts = line.splitn(3, ',');
        if let (Some(id), Some(kind), Some(path)) = (parts.next(), parts.next(), parts.next()) {
            if let (Ok(id), Ok(kind)) = (id.trim().parse(), kind.trim().parse()) {
                map.insert(path.trim().to_string(), (id, kind));
            }
        }
    }
    if map.is_empty() {
        return Err("empty manifest".into());
    }
    Ok(map)
}

// Tipos: 0 bool, 1 int32, 2 float, 3 double, 4 texto, 5 long
fn get_state(stream: &mut TcpStream, id: i32, kind: i32) -> Result<Value, String> {
    send_request(stream, id)?;
    let _id = read_i32(stream)?;
    let len = read_i32(stream)?;
    let b = read_bytes(stream, len.max(0) as usize)?;
    let num = |n: usize| b.get(..n).ok_or_else(|| "short reply".to_string());
    Ok(match kind {
        0 => Value::Bool(num(1)?[0] != 0),
        1 => Value::from(i32::from_le_bytes(num(4)?.try_into().unwrap())),
        2 => Value::from(f32::from_le_bytes(num(4)?.try_into().unwrap()) as f64),
        3 => Value::from(f64::from_le_bytes(num(8)?.try_into().unwrap())),
        4 => Value::String(String::from_utf8_lossy(b.get(4..).unwrap_or_default()).into_owned()),
        5 => Value::from(i64::from_le_bytes(num(8)?.try_into().unwrap())),
        _ => Value::Null,
    })
}
