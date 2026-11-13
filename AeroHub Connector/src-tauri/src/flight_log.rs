// Gravação do voo (para o playback, o rastro e os gráficos do AeroHub Radar).
//
// Enquanto o Feeder está ligado, o app grava 1 ponto por segundo do voo num ficheiro temporário:
//   <dados do app>/flight-logs/<voo>.jsonl   pontos, um por linha:
//       [hora (ms), latitude, longitude, altitude (ft), altura ao chão (ft), velocidade no solo (kts),
//        velocidade vertical (fpm), proa (graus), velocidade indicada (kts), no chão (1/0)]
//   <dados do app>/flight-logs/<voo>.json    resumo: avião, pintura, partida, destino, início, último ponto, fim
//
// Um ficheiro por voo, pelo número do voo do Infinite Flight: outro voo (sair e voltar a entrar, outro sítio)
// é outro número e outro ficheiro, por isso nunca se misturam. O mesmo voo depois de uma falha (telemóvel
// desligou, internet caiu, app fechou ou atualizou) continua no mesmo ficheiro, sem perder o que já tinha.
// Sem número de voo (voo solo, fora do Live): "solo-<hora de início>", até mudar de avião ou sair do voo.
//
// Nada fica guardado para sempre: o voo acaba quando a pessoa sai do voo no jogo, começa outro voo, ou
// passam 30 minutos sem pontos; 1 hora depois de acabar, os ficheiros são apagados (de minuto a minuto,
// e ao abrir o app). A pessoa pode apagar antes, na página Armazenamento do app.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};

// 1 por segundo (um pouco abaixo de 1 s: a volta do Feeder nunca cai certinha no segundo)
const POINT_EVERY: Duration = Duration::from_millis(900);
const META_EVERY: Duration = Duration::from_secs(10);
// Sem pontos durante este tempo: o voo conta como acabado (ex.: o app ficou fechado)
const IDLE_ENDS_AFTER_MS: u64 = 30 * 60 * 1000;
// Depois de acabar, fica este tempo e é apagado
const KEEP_AFTER_END_MS: u64 = 60 * 60 * 1000;
const CLEANUP_EVERY: Duration = Duration::from_secs(60);
// "A gravar agora" só se o último ponto for recente (o Feeder pode ter caído sem o voo acabar)
const RECORDING_MS: u64 = 60 * 1000;

const KNOTS: f64 = 1.943844;
const FPM: f64 = 196.8504;

static DIR: OnceLock<PathBuf> = OnceLock::new();
// Voo a ser gravado agora (para o mapa local e para a página Armazenamento)
static ACTIVE: Mutex<Option<String>> = Mutex::new(None);
// A pessoa apagou o voo que está a ser gravado: a gravação recomeça do zero
static ACTIVE_DELETED: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct Meta {
    key: String,
    flight_id: Option<String>,
    aircraft: Option<String>,
    livery: Option<String>,
    origin: Option<String>,
    destination: Option<String>,
    started_at: u64,
    last_at: u64,
    ended_at: Option<u64>,
    points: u64,
}

// Um voo guardado, como aparece na página Armazenamento
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredFlight {
    key: String,
    aircraft: Option<String>,
    livery: Option<String>,
    origin: Option<String>,
    destination: Option<String>,
    started_at: u64,
    last_at: u64,
    points: u64,
    bytes: u64,
    // A ser gravado agora
    active: bool,
    // Quando é apagado sozinho (ms); None = ainda a ser gravado
    expires_at: Option<u64>,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64)
}

fn points_file(key: &str) -> Option<PathBuf> {
    DIR.get().map(|dir| dir.join(format!("{key}.jsonl")))
}

fn meta_file(key: &str) -> Option<PathBuf> {
    DIR.get().map(|dir| dir.join(format!("{key}.json")))
}

fn read_meta(key: &str) -> Option<Meta> {
    let text = fs::read_to_string(meta_file(key)?).ok()?;
    serde_json::from_str(&text).ok()
}

// Só letras, números e "-" (o número do voo vira nome de ficheiro)
fn safe_key(id: &str) -> String {
    id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').take(64).collect()
}

// Quando o voo é apagado sozinho. None = ainda a decorrer
fn expires_at(meta: &Meta, now: u64) -> Option<u64> {
    let ended = meta.ended_at.or_else(|| {
        (now.saturating_sub(meta.last_at) > IDLE_ENDS_AFTER_MS).then_some(meta.last_at + IDLE_ENDS_AFTER_MS)
    })?;
    Some(ended + KEEP_AFTER_END_MS)
}

fn is_recording(meta: &Meta, now: u64) -> bool {
    ACTIVE.lock().unwrap().as_deref() == Some(meta.key.as_str()) && now.saturating_sub(meta.last_at) < RECORDING_MS
}

// Chamado ao arrancar o app: pasta dos voos, limpeza agora e de minuto a minuto
pub fn init(app_data: PathBuf) {
    let dir = app_data.join("flight-logs");
    let _ = fs::create_dir_all(&dir);
    let _ = DIR.set(dir);
    thread::spawn(|| loop {
        cleanup();
        thread::sleep(CLEANUP_EVERY);
    });
}

// Apaga os voos que já passaram do prazo (e ficheiros soltos sem resumo)
fn cleanup() {
    let Some(dir) = DIR.get() else { return };
    let Ok(entries) = fs::read_dir(dir) else { return };
    let now = now_ms();
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(key) = path.file_stem().and_then(|s| s.to_str()).map(str::to_string) else { continue };
        let expired = match read_meta(&key) {
            Some(meta) => !is_recording(&meta, now) && expires_at(&meta, now).is_some_and(|at| at <= now),
            // Pontos sem resumo: apaga se o ficheiro já não mexe há mais do que o prazo todo
            None => entry
                .metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.elapsed().ok())
                .is_some_and(|age| age.as_millis() as u64 > IDLE_ENDS_AFTER_MS + KEEP_AFTER_END_MS),
        };
        if expired {
            let _ = fs::remove_file(&path);
        }
    }
}

// Gravador do voo (um por ligação do Feeder; corre na mesma volta que lê os dados do jogo)
#[derive(Default)]
pub struct FlightLog {
    meta: Option<Meta>,
    point_at: Option<Instant>,
    meta_at: Option<Instant>,
}

impl FlightLog {
    pub fn record(&mut self, data: &Map<String, Value>) {
        let text = |key: &str| data.get(key).and_then(Value::as_str).unwrap_or("").trim().to_string();
        let num = |key: &str| data.get(key).and_then(Value::as_f64);

        // Saiu do voo (menu do jogo): o voo acaba
        let app_state = text("appState").to_lowercase();
        if !app_state.is_empty() && !app_state.contains("play") && !app_state.contains("pause") {
            self.end();
            return;
        }
        let (Some(lat), Some(lon)) = (num("latitude"), num("longitude")) else { return };
        if lat == 0.0 && lon == 0.0 {
            return;
        }

        // Que voo é este? O número do jogo (+ a perna, se aterrou e pôs outro plano: ver Diversion em feeder.rs);
        // sem ele, um "solo" até mudar de avião
        let flight_id = Some(text("flightKey")).filter(|k| !k.is_empty()).unwrap_or_else(|| text("flightId"));
        let live = !flight_id.is_empty() && flight_id.chars().any(|c| c != '0' && c != '-');
        let aircraft = text("aircraft");
        let key = if live {
            safe_key(&flight_id)
        } else {
            match &self.meta {
                Some(meta) if meta.key.starts_with("solo-") && meta.aircraft.as_deref() == Some(aircraft.as_str()) => {
                    meta.key.clone()
                }
                _ => format!("solo-{}", now_ms()),
            }
        };
        // Apagado na página Armazenamento a meio da gravação: recomeça limpo
        if ACTIVE_DELETED.swap(false, Ordering::SeqCst) {
            if let Some(old) = self.meta.take() {
                for file in [points_file(&old.key), meta_file(&old.key)].into_iter().flatten() {
                    let _ = fs::remove_file(file);
                }
            }
        }
        if self.meta.as_ref().map(|m| m.key.as_str()) != Some(key.as_str()) {
            self.end();
            self.start(&key, live.then_some(flight_id));
        }

        let now = now_ms();
        let Some(meta) = self.meta.as_mut() else { return };
        meta.aircraft = Some(aircraft).filter(|s| !s.is_empty()).or(meta.aircraft.take());
        meta.livery = Some(text("livery")).filter(|s| !s.is_empty()).or(meta.livery.take());
        meta.origin = Some(text("planOrigin")).filter(|s| !s.is_empty()).or(meta.origin.take());
        let destination = Some(text("divertedTo")).filter(|s| !s.is_empty()).or(Some(text("planDestination")));
        meta.destination = destination.filter(|s| !s.is_empty()).or(meta.destination.take());

        if self.point_at.map_or(true, |at| at.elapsed() >= POINT_EVERY) {
            self.point_at = Some(Instant::now());
            let round = |v: Option<f64>, scale: f64| v.map_or(Value::Null, |v| Value::from((v * scale).round() as i64));
            let heading = num("headingTrue").map(|r| (r.to_degrees() + 360.0) % 360.0);
            let point = Value::Array(vec![
                Value::from(now),
                Value::from((lat * 1e5).round() / 1e5),
                Value::from((lon * 1e5).round() / 1e5),
                round(num("altitudeMsl"), 1.0),
                round(num("altitudeAgl"), 1.0),
                round(num("groundSpeed"), KNOTS),
                round(num("verticalSpeed"), FPM),
                round(heading, 1.0),
                round(num("indicatedAirspeed"), KNOTS),
                Value::from(u8::from(data.get("onGround").and_then(Value::as_bool).unwrap_or(false))),
            ]);
            if let Some(file) = points_file(&meta.key) {
                if let Ok(mut out) = OpenOptions::new().create(true).append(true).open(file) {
                    if writeln!(out, "{point}").is_ok() {
                        meta.points += 1;
                        meta.last_at = now;
                    }
                }
            }
        }
        if self.meta_at.map_or(true, |at| at.elapsed() >= META_EVERY) {
            self.meta_at = Some(Instant::now());
            self.save();
        }
    }

    // Abre o voo: o mesmo voo já guardado (voltou depois de uma falha) continua; senão começa um novo
    fn start(&mut self, key: &str, flight_id: Option<String>) {
        let now = now_ms();
        let meta = match read_meta(key) {
            Some(mut saved) => {
                saved.ended_at = None;
                saved
            }
            None => {
                // Pontos sem resumo (ex.: apagado a meio): começa limpo
                if let Some(file) = points_file(key) {
                    let _ = fs::remove_file(file);
                }
                Meta { key: key.to_string(), flight_id, started_at: now, last_at: now, ..Default::default() }
            }
        };
        self.meta = Some(meta);
        self.point_at = None;
        self.meta_at = None;
        *ACTIVE.lock().unwrap() = Some(key.to_string());
        self.save();
    }

    // O voo acabou: fica marcado com a hora (é apagado 1 hora depois)
    pub fn end(&mut self) {
        if let Some(meta) = self.meta.as_mut() {
            meta.ended_at = Some(now_ms());
        }
        self.save();
        self.meta = None;
        *ACTIVE.lock().unwrap() = None;
    }

    fn save(&self) {
        let Some(meta) = &self.meta else { return };
        if let (Some(file), Ok(text)) = (meta_file(&meta.key), serde_json::to_string(meta)) {
            let _ = fs::write(file, text);
        }
    }
}

// ---------- Página Armazenamento ----------

#[tauri::command]
pub fn storage_list() -> Vec<StoredFlight> {
    let Some(dir) = DIR.get() else { return Vec::new() };
    let Ok(entries) = fs::read_dir(dir) else { return Vec::new() };
    let now = now_ms();
    let size = |path: Option<PathBuf>| path.and_then(|p| fs::metadata(p).ok()).map_or(0, |m| m.len());
    let mut list: Vec<StoredFlight> = entries
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "json"))
        .filter_map(|e| read_meta(e.path().file_stem()?.to_str()?))
        .map(|meta| {
            let is_active = is_recording(&meta, now);
            StoredFlight {
                bytes: size(points_file(&meta.key)) + size(meta_file(&meta.key)),
                active: is_active,
                expires_at: if is_active { None } else { expires_at(&meta, now) },
                key: meta.key,
                aircraft: meta.aircraft,
                livery: meta.livery,
                origin: meta.origin,
                destination: meta.destination,
                started_at: meta.started_at,
                last_at: meta.last_at,
                points: meta.points,
            }
        })
        .collect();
    list.sort_by(|a, b| b.last_at.cmp(&a.last_at));
    list
}

#[tauri::command]
pub fn storage_delete(key: String) {
    let key = safe_key(&key);
    if ACTIVE.lock().unwrap().as_deref() == Some(key.as_str()) {
        ACTIVE_DELETED.store(true, Ordering::SeqCst);
    }
    for file in [points_file(&key), meta_file(&key)].into_iter().flatten() {
        let _ = fs::remove_file(file);
    }
}

#[tauri::command]
pub fn storage_delete_all() {
    for flight in storage_list() {
        storage_delete(flight.key);
    }
}
