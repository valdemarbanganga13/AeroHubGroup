// Envia o voo do Feeder para o servidor do AeroHub Group (src/live/feeder.mjs no AeroHub Server).
//
// - Só liga quando há um voo num servidor Live a chegar do jogo: quem tem o app aberto sem voar não ocupa nenhuma ligação.
// - A primeira mensagem é a sessão da conta (o token nunca vai no endereço). O nome do piloto quem sabe é o servidor.
// - Posição e valores do jogo: no máximo 1 vez por segundo, seja qual for o ritmo escolhido na página Feeder.
//   Dados do voo e plano de voo: só quando mudam.
// - Vale sempre o dado mais recente: se a rede ficar lenta, os dados velhos não se acumulam.
// - A ligação caiu: volta a ligar sozinho, à espera de 1 s, 2 s, 4 s… até 30 s, com um tempo ao acaso para não voltarem todos
//   no mesmo instante. Conta não verificada ou outro PC com a mesma conta: não insiste até se voltar a ligar o Feeder.
//   Sessão recusada: pede uma nova à janela.
// - Nada corre na janela: continua a enviar com o app minimizado.

use serde::Serialize;
use serde_json::{json, Map, Value};
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tungstenite::client::IntoClientRequest;
use tungstenite::stream::MaybeTlsStream;
use tungstenite::{Message, WebSocket};

const POSITION_EVERY: Duration = Duration::from_secs(1);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const AUTH_TIMEOUT: Duration = Duration::from_secs(20);
const READ_POLL: Duration = Duration::from_millis(100);
const WRITE_TIMEOUT: Duration = Duration::from_secs(10);
// Sem dados do jogo há mais tempo do que isto: o voo acabou e a ligação fecha
const DATA_STALE: Duration = Duration::from_secs(15);
const RETRY_MAX_SECS: u64 = 30;
// Ligado há mais tempo do que isto: a próxima falha volta a contar do início
const STABLE_AFTER: Duration = Duration::from_secs(60);
// O servidor recusa mensagens maiores do que 64 KB: um plano gigante não vai, o resto continua
const MAX_PLAN_BYTES: usize = 60_000;

const POSITION_FIELDS: &[&str] = &[
    "latitude", "longitude", "altitudeMsl", "altitudeAgl", "headingTrue", "groundSpeed", "indicatedAirspeed", "trueAirspeed",
    "mach", "oat", "headwind", "crosswind", "windFromTrue", "windSpeed", "verticalSpeed", "pitch", "bank", "onGround",
];
const META_FIELDS: &[&str] = &[
    "server", "flightKey", "planOrigin", "planDestination", "originalDestination", "divertedTo", "destinationEte",
    "destinationDist", "takeoffAt", "landedAt",
];
const PLAN_FIELDS: &[&str] = &["planCoordinates", "planNames"];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UplinkState {
    Off,         // Feeder desligado, ou sem voo num servidor Live
    Connecting,  // a ligar ao servidor
    Waiting,     // ligado; à espera de a Live API mostrar o voo
    OnMap,       // o voo está no mapa
    Retrying,    // sem ligação ao servidor, a tentar outra vez
    NeedsLogin,  // a sessão foi recusada
    NotVerified, // a conta já não tem o Infinite Flight verificado
    Replaced,    // outro PC ligou com a mesma conta
}

#[derive(Default)]
struct Shared {
    url: Option<String>,
    token: Option<String>,
    token_version: u64,
    latest: Option<(Map<String, Value>, Instant)>,
    // Conta recusada ou outro PC: fica parado até se voltar a ligar o Feeder
    blocked: bool,
}

type StatusFn = dyn Fn(UplinkState) + Send + Sync;

pub struct Uplink {
    shared: Arc<Mutex<Shared>>,
}

// Só wss://, ou ws:// dentro do próprio PC (para testes): o token nunca passa sem encriptação pela rede
pub fn url_allowed(url: &str) -> bool {
    if url.starts_with("wss://") {
        return true;
    }
    let Some(rest) = url.strip_prefix("ws://") else { return false };
    let host = rest.split(['/', ':']).next().unwrap_or("");
    host == "localhost" || host == "127.0.0.1"
}

fn subset(data: &Map<String, Value>, fields: &[&str], kind: &str) -> Map<String, Value> {
    let mut out = Map::new();
    out.insert("t".into(), Value::from(kind));
    for field in fields {
        if let Some(value) = data.get(*field) {
            if !value.is_null() {
                out.insert((*field).to_string(), value.clone());
            }
        }
    }
    out
}

// Um voo num servidor Live? Em Solo ou nos menus do jogo, não há nada para mostrar no mapa
pub fn is_live_flight(data: &Map<String, Value>) -> bool {
    let text = |key: &str| data.get(key).and_then(Value::as_str).unwrap_or("").trim().to_lowercase();
    let state = text("appState");
    !text("server").is_empty() && !text("flightId").is_empty() && (state.contains("play") || state.contains("pause"))
}

fn is_timeout(error: &tungstenite::Error) -> bool {
    matches!(error, tungstenite::Error::Io(io) if matches!(io.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut))
}

fn set_timeouts(socket: &mut WebSocket<MaybeTlsStream<TcpStream>>) {
    let stream = match socket.get_mut() {
        MaybeTlsStream::Plain(stream) => Some(&*stream),
        MaybeTlsStream::Rustls(tls) => Some(&tls.sock),
        _ => None,
    };
    if let Some(stream) = stream {
        stream.set_read_timeout(Some(READ_POLL)).ok();
        stream.set_write_timeout(Some(WRITE_TIMEOUT)).ok();
    }
}

fn open(url: &str) -> Result<WebSocket<MaybeTlsStream<TcpStream>>, String> {
    let request = url.into_client_request().map_err(|e| e.to_string())?;
    let host = request.uri().host().ok_or("no host")?.to_string();
    let secure = request.uri().scheme_str() == Some("wss");
    let port = request.uri().port_u16().unwrap_or(if secure { 443 } else { 80 });
    // Um nome pode ter vários endereços (localhost: ::1 e 127.0.0.1) e o primeiro pode não responder: tenta-os todos
    let host = host.trim_matches(['[', ']']);
    let mut last_error = "no address".to_string();
    let mut connected = None;
    for address in (host, port).to_socket_addrs().map_err(|e| e.to_string())? {
        match TcpStream::connect_timeout(&address, CONNECT_TIMEOUT) {
            Ok(stream) => {
                connected = Some(stream);
                break;
            }
            Err(error) => last_error = error.to_string(),
        }
    }
    let stream = connected.ok_or(last_error)?;
    stream.set_nodelay(true).ok();
    stream.set_read_timeout(Some(CONNECT_TIMEOUT)).ok();
    stream.set_write_timeout(Some(CONNECT_TIMEOUT)).ok();
    let (mut socket, _) = tungstenite::client_tls(request, stream).map_err(|e| e.to_string())?;
    set_timeouts(&mut socket);
    Ok(socket)
}

fn send(socket: &mut WebSocket<MaybeTlsStream<TcpStream>>, value: Value) -> Result<(), ()> {
    socket.send(Message::text(value.to_string())).map_err(|_| ())
}

// Como acabou uma ligação
enum Ended {
    FlightOver,
    Lost,
    Code(u16),
}

impl Uplink {
    pub fn start(on_status: Arc<StatusFn>) -> Self {
        let shared = Arc::new(Mutex::new(Shared::default()));
        let worker = shared.clone();
        thread::spawn(move || run(worker, on_status));
        Self { shared }
    }

    // Endereço do servidor e sessão da conta. Sem sessão: não liga.
    pub fn set_session(&self, url: String, token: Option<String>) {
        let mut shared = self.shared.lock().unwrap();
        shared.url = url_allowed(&url).then_some(url);
        if shared.token != token {
            shared.token = token;
            shared.token_version += 1;
        }
    }

    pub fn publish(&self, data: &Map<String, Value>) {
        self.shared.lock().unwrap().latest = Some((data.clone(), Instant::now()));
    }

    pub fn flight_ended(&self) {
        self.shared.lock().unwrap().latest = None;
    }

    // O Feeder voltou a ser ligado: uma conta recusada ou trocada de PC pode tentar outra vez
    pub fn unblock(&self) {
        self.shared.lock().unwrap().blocked = false;
    }
}

fn run(shared: Arc<Mutex<Shared>>, on_status: Arc<StatusFn>) {
    let mut attempts: u32 = 0;
    let mut status = UplinkState::Off;
    let set = |state: UplinkState, status: &mut UplinkState| {
        if *status != state {
            *status = state;
            on_status(state);
        }
    };
    loop {
        // Espera até haver voo, endereço e sessão
        let ready = {
            let guard = shared.lock().unwrap();
            let fresh = guard.latest.as_ref().is_some_and(|(_, at)| at.elapsed() < DATA_STALE);
            match (&guard.url, &guard.token) {
                (Some(url), Some(token)) if fresh && !guard.blocked => Some((url.clone(), token.clone(), guard.token_version)),
                _ => None,
            }
        };
        let Some((url, token, version)) = ready else {
            let blocked = shared.lock().unwrap().blocked;
            if !blocked && !matches!(status, UplinkState::NeedsLogin) {
                set(UplinkState::Off, &mut status);
            }
            thread::sleep(Duration::from_millis(250));
            continue;
        };

        set(UplinkState::Connecting, &mut status);
        let started = Instant::now();
        let ended = match open(&url) {
            Ok(mut socket) => session(&shared, &mut socket, &token, version, &on_status, &mut status),
            Err(_) => Ended::Lost,
        };
        if started.elapsed() >= STABLE_AFTER {
            attempts = 0;
        }
        match ended {
            Ended::FlightOver => {
                attempts = 0;
                set(UplinkState::Off, &mut status);
            }
            Ended::Code(4403) => {
                shared.lock().unwrap().blocked = true;
                set(UplinkState::NotVerified, &mut status);
            }
            Ended::Code(4409) => {
                shared.lock().unwrap().blocked = true;
                set(UplinkState::Replaced, &mut status);
            }
            // Sessão recusada: a janela renova-a. Só volta a tentar com outra sessão ou, por segurança, ao fim do tempo de espera.
            Ended::Code(4401) => {
                set(UplinkState::NeedsLogin, &mut status);
                wait_for_retry(&shared, &mut attempts, Some(version));
            }
            Ended::Lost | Ended::Code(_) => {
                set(UplinkState::Retrying, &mut status);
                wait_for_retry(&shared, &mut attempts, None);
            }
        }
    }
}

// Espera 1 s, 2 s, 4 s… até 30 s, entre metade e o tempo inteiro. Acaba logo se chegar outra sessão (quando vinha de uma recusada).
fn wait_for_retry(shared: &Mutex<Shared>, attempts: &mut u32, token_version: Option<u64>) {
    let top = (1u64 << (*attempts).min(5)).min(RETRY_MAX_SECS) * 1000;
    *attempts += 1;
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| u64::from(d.subsec_nanos()));
    let wait = Duration::from_millis(top / 2 + nanos % (top / 2 + 1));
    let start = Instant::now();
    while start.elapsed() < wait {
        if let Some(version) = token_version {
            if shared.lock().unwrap().token_version != version {
                return;
            }
        }
        thread::sleep(Duration::from_millis(100));
    }
}

fn session(
    shared: &Mutex<Shared>,
    socket: &mut WebSocket<MaybeTlsStream<TcpStream>>,
    token: &str,
    mut version: u64,
    on_status: &Arc<StatusFn>,
    status: &mut UplinkState,
) -> Ended {
    if send(socket, json!({ "t": "auth", "token": token })).is_err() {
        return Ended::Lost;
    }
    let set = |state: UplinkState, status: &mut UplinkState| {
        if *status != state {
            *status = state;
            on_status(state);
        }
    };
    let opened = Instant::now();
    let mut accepted = false;
    let mut sent_position: Option<Instant> = None;
    let mut sent_meta = String::new();
    let mut sent_plan = String::new();
    loop {
        // O que chega do servidor
        match socket.read() {
            Ok(Message::Text(text)) => {
                let message: Value = serde_json::from_str(text.as_str()).unwrap_or(Value::Null);
                match message.get("t").and_then(Value::as_str) {
                    Some("ok") => {
                        accepted = true;
                        set(UplinkState::Waiting, status);
                    }
                    Some("map") => {
                        let on = message.get("on").and_then(Value::as_bool).unwrap_or(false);
                        set(if on { UplinkState::OnMap } else { UplinkState::Waiting }, status);
                    }
                    _ => {}
                }
            }
            Ok(Message::Close(frame)) => {
                return frame.map_or(Ended::Lost, |frame| Ended::Code(frame.code.into()));
            }
            Ok(_) => {}
            Err(error) if is_timeout(&error) => {}
            Err(_) => return Ended::Lost,
        }
        if !accepted {
            if opened.elapsed() > AUTH_TIMEOUT {
                return Ended::Lost;
            }
            continue;
        }

        // O que há para enviar
        let (latest, new_token) = {
            let guard = shared.lock().unwrap();
            let fresh = guard.latest.as_ref().filter(|(_, at)| at.elapsed() < DATA_STALE).map(|(data, _)| data.clone());
            let renewed = (guard.token_version != version).then(|| (guard.token.clone(), guard.token_version));
            (fresh, renewed)
        };
        if let Some((value, new_version)) = new_token {
            version = new_version;
            match value {
                Some(value) => {
                    if send(socket, json!({ "t": "token", "token": value })).is_err() {
                        return Ended::Lost;
                    }
                }
                // Saiu da conta: acaba o envio
                None => {
                    let _ = send(socket, json!({ "t": "off" }));
                    let _ = socket.close(None);
                    return Ended::FlightOver;
                }
            }
        }
        let Some(data) = latest else {
            // O voo acabou: o mapa deixa de o mostrar já, sem esperar
            let _ = send(socket, json!({ "t": "off" }));
            let _ = socket.close(None);
            let _ = socket.flush();
            return Ended::FlightOver;
        };
        // Primeiro os dados do voo: o servidor precisa deles para saber em que servidor do jogo está
        let meta = Value::Object(subset(&data, META_FIELDS, "m")).to_string();
        if meta != sent_meta {
            if socket.send(Message::text(meta.clone())).is_err() {
                return Ended::Lost;
            }
            sent_meta = meta;
        }
        let plan = Value::Object(subset(&data, PLAN_FIELDS, "r")).to_string();
        if plan != sent_plan && plan.len() <= MAX_PLAN_BYTES {
            if socket.send(Message::text(plan.clone())).is_err() {
                return Ended::Lost;
            }
            sent_plan = plan;
        }
        if sent_position.map_or(true, |at| at.elapsed() >= POSITION_EVERY) {
            let position = Value::Object(subset(&data, POSITION_FIELDS, "p")).to_string();
            if socket.send(Message::text(position)).is_err() {
                return Ended::Lost;
            }
            sent_position = Some(Instant::now());
        }
    }
}

// ---------- O envio do app ----------
static UPLINK: OnceLock<Uplink> = OnceLock::new();

pub fn install(app: AppHandle) {
    let _ = UPLINK.set(Uplink::start(Arc::new(move |state| {
        let _ = app.emit("feeder://uplink", state);
    })));
}

pub fn publish(data: &Map<String, Value>) {
    if let Some(uplink) = UPLINK.get() {
        if is_live_flight(data) {
            uplink.publish(data);
        } else {
            uplink.flight_ended();
        }
    }
}

pub fn flight_ended() {
    if let Some(uplink) = UPLINK.get() {
        uplink.flight_ended();
    }
}

pub fn unblock() {
    if let Some(uplink) = UPLINK.get() {
        uplink.unblock();
    }
}

// A janela envia o endereço do servidor e a sessão da conta (também sempre que se renova)
#[tauri::command]
pub fn feeder_set_session(url: String, token: Option<String>) {
    if let Some(uplink) = UPLINK.get() {
        uplink.set_session(url, token);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;
    use std::sync::mpsc::{channel, Receiver, Sender};
    use tungstenite::protocol::frame::coding::CloseCode;
    use tungstenite::protocol::CloseFrame;

    // Um servidor a sério na máquina: entrega o que recebe e fecha com o código pedido
    enum Reply {
        Text(String),
        Close(u16),
        Drop,
    }

    fn server() -> (String, Receiver<Value>, Sender<Reply>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("ws://127.0.0.1:{}/api/feeder/ws", listener.local_addr().unwrap().port());
        let (got_tx, got_rx) = channel();
        let (reply_tx, reply_rx) = channel::<Reply>();
        thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                stream.set_read_timeout(Some(Duration::from_millis(50))).ok();
                let Ok(mut ws) = tungstenite::accept(stream) else { continue };
                loop {
                    match ws.read() {
                        Ok(Message::Text(text)) => {
                            let _ = got_tx.send(serde_json::from_str::<Value>(text.as_str()).unwrap());
                        }
                        Ok(_) => {}
                        Err(error) if is_timeout(&error) => {}
                        Err(_) => break,
                    }
                    match reply_rx.try_recv() {
                        Ok(Reply::Text(text)) => {
                            let _ = ws.send(Message::text(text));
                        }
                        Ok(Reply::Close(code)) => {
                            let _ = ws.close(Some(CloseFrame { code: CloseCode::from(code), reason: "".into() }));
                            let _ = ws.flush();
                        }
                        Ok(Reply::Drop) => break,
                        Err(_) => {}
                    }
                }
            }
        });
        (url, got_rx, reply_tx)
    }

    fn flight(lat: f64) -> Map<String, Value> {
        json!({
            "latitude": lat, "longitude": -9.1, "altitudeMsl": 35000.0, "headingTrue": 1.5, "groundSpeed": 230.0, "onGround": false,
            "server": "Expert Server", "flightId": "abc", "appState": "Playing", "planOrigin": "LPPT", "planDestination": "KJFK",
            "planCoordinates": "38.7,-9.1 40.6,-73.7", "planNames": "LPPT,KJFK", "user": "ninguem", "aircraft": "A320"
        }).as_object().unwrap().clone()
    }

    fn statuses() -> (Arc<StatusFn>, Receiver<UplinkState>) {
        let (tx, rx) = channel();
        let tx = Mutex::new(tx);
        (Arc::new(move |state| { let _ = tx.lock().unwrap().send(state); }), rx)
    }

    fn until(rx: &Receiver<Value>, kind: &str) -> Value {
        let start = Instant::now();
        while start.elapsed() < Duration::from_secs(10) {
            if let Ok(value) = rx.recv_timeout(Duration::from_millis(200)) {
                if value["t"] == kind {
                    return value;
                }
            }
        }
        panic!("não chegou: {kind}");
    }

    fn until_state(rx: &Receiver<UplinkState>, wanted: UplinkState) {
        let start = Instant::now();
        while start.elapsed() < Duration::from_secs(10) {
            if rx.recv_timeout(Duration::from_millis(200)) == Ok(wanted) {
                return;
            }
        }
        panic!("estado não chegou: {wanted:?}");
    }

    #[test]
    fn so_liga_com_wss_ou_dentro_do_pc() {
        assert!(url_allowed("wss://aerohubradar.com/api/feeder/ws"));
        assert!(url_allowed("ws://localhost:8080/api/feeder/ws"));
        assert!(url_allowed("ws://127.0.0.1:8080/x"));
        assert!(!url_allowed("ws://aerohubradar.com/api/feeder/ws"));
        assert!(!url_allowed("ws://localhost.mau.example/x"));
        assert!(!url_allowed("http://localhost:8080"));
        assert!(!url_allowed(""));
    }

    // O servidor só ouve em 127.0.0.1 e o nome também aponta para ::1, que recusa a ligação (foi o que aconteceu neste PC)
    #[test]
    fn localhost_chega_ao_servidor_mesmo_se_o_primeiro_endereco_recusar() {
        let (url, got, _reply) = server();
        let (on_status, _state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url.replace("127.0.0.1", "localhost"), Some("t".into()));
        uplink.publish(&flight(1.0));
        assert_eq!(got.recv_timeout(Duration::from_secs(10)).unwrap()["t"], "auth");
    }

    #[test]
    fn so_voos_em_servidor_live() {
        assert!(is_live_flight(&flight(1.0)));
        let mut solo = flight(1.0);
        solo.insert("server".into(), Value::from(""));
        assert!(!is_live_flight(&solo));
        let mut menu = flight(1.0);
        menu.insert("appState".into(), Value::from("Menu"));
        assert!(!is_live_flight(&menu));
    }

    #[test]
    fn sessao_primeiro_depois_os_dados_e_so_os_campos_certos() {
        let (url, got, reply) = server();
        let (on_status, state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("token-1".into()));
        uplink.publish(&flight(38.7));
        let auth = got.recv_timeout(Duration::from_secs(10)).unwrap();
        assert_eq!(auth["t"], "auth");
        assert_eq!(auth["token"], "token-1");
        reply.send(Reply::Text(r#"{"t":"ok","user":"ana"}"#.into())).unwrap();
        until_state(&state, UplinkState::Waiting);

        let meta = until(&got, "m");
        assert_eq!(meta["server"], "Expert Server");
        assert_eq!(meta["planDestination"], "KJFK");
        assert!(meta.get("user").is_none());
        let plan = until(&got, "r");
        assert_eq!(plan["planNames"], "LPPT,KJFK");
        let position = until(&got, "p");
        assert_eq!(position["latitude"], 38.7);
        assert_eq!(position["onGround"], false);
        assert!(position.get("user").is_none());
        assert!(position.get("server").is_none());

        reply.send(Reply::Text(r#"{"t":"map","on":true}"#.into())).unwrap();
        until_state(&state, UplinkState::OnMap);
    }

    #[test]
    fn no_maximo_uma_posicao_por_segundo_e_vale_a_mais_recente() {
        let (url, got, reply) = server();
        let (on_status, _state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("t".into()));
        uplink.publish(&flight(1.0));
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        until(&got, "p");
        // 10 por segundo durante 3 s
        let start = Instant::now();
        let mut i = 0.0;
        while start.elapsed() < Duration::from_secs(3) {
            i += 1.0;
            uplink.publish(&flight(2.0 + i));
            thread::sleep(Duration::from_millis(100));
        }
        let mut positions = Vec::new();
        while let Ok(value) = got.try_recv() {
            if value["t"] == "p" {
                positions.push(value["latitude"].as_f64().unwrap());
            }
        }
        assert!((2..=4).contains(&positions.len()), "{positions:?}");
        assert!(positions.last().unwrap() > &10.0, "{positions:?}");
        // Plano e dados do voo não mudaram: não se repetem
    }

    #[test]
    fn dados_do_voo_e_plano_so_quando_mudam() {
        let (url, got, reply) = server();
        let (on_status, _state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("t".into()));
        uplink.publish(&flight(1.0));
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        until(&got, "r");
        thread::sleep(Duration::from_millis(1500));
        uplink.publish(&flight(1.1));
        thread::sleep(Duration::from_millis(1200));
        let mut seen = Vec::new();
        while let Ok(value) = got.try_recv() {
            seen.push(value["t"].as_str().unwrap().to_string());
        }
        assert!(!seen.iter().any(|t| t == "m" || t == "r"), "{seen:?}");
        let mut changed = flight(1.2);
        changed.insert("planDestination".into(), Value::from("EGLL"));
        uplink.publish(&changed);
        assert_eq!(until(&got, "m")["planDestination"], "EGLL");
    }

    #[test]
    fn plano_gigante_nao_vai_mas_o_resto_continua() {
        let (url, got, reply) = server();
        let (on_status, _state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("t".into()));
        let mut big = flight(1.0);
        big.insert("planCoordinates".into(), Value::from("1".repeat(70_000)));
        uplink.publish(&big);
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        let mut seen = Vec::new();
        let start = Instant::now();
        while start.elapsed() < Duration::from_secs(2) {
            if let Ok(value) = got.recv_timeout(Duration::from_millis(100)) {
                seen.push(value["t"].as_str().unwrap().to_string());
            }
        }
        assert!(seen.iter().any(|t| t == "p"));
        assert!(!seen.iter().any(|t| t == "r"));
    }

    #[test]
    fn a_ligacao_cai_e_volta_sozinha() {
        let (url, got, reply) = server();
        let (on_status, state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("t".into()));
        uplink.publish(&flight(1.0));
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        until(&got, "p");
        reply.send(Reply::Drop).unwrap();
        until_state(&state, UplinkState::Retrying);
        // O jogo continua a mandar dados; volta a ligar e a primeira mensagem é outra vez a sessão
        let start = Instant::now();
        loop {
            uplink.publish(&flight(1.0));
            if let Ok(value) = got.recv_timeout(Duration::from_millis(200)) {
                if value["t"] == "auth" {
                    break;
                }
            }
            assert!(start.elapsed() < Duration::from_secs(10), "não voltou a ligar");
        }
    }

    #[test]
    fn outro_pc_com_a_mesma_conta_nao_fica_a_lutar() {
        let (url, got, reply) = server();
        let (on_status, state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("t".into()));
        uplink.publish(&flight(1.0));
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        until(&got, "p");
        reply.send(Reply::Close(4409)).unwrap();
        until_state(&state, UplinkState::Replaced);
        for _ in 0..15 {
            uplink.publish(&flight(1.0));
            thread::sleep(Duration::from_millis(200));
        }
        while let Ok(value) = got.try_recv() {
            assert_ne!(value["t"], "auth", "não devia voltar a ligar");
        }
        // Voltar a ligar o Feeder pode tentar de novo
        uplink.unblock();
        reply.send(Reply::Drop).unwrap();
        until(&got, "auth");
    }

    #[test]
    fn sessao_recusada_pede_outra_e_liga_logo_com_a_nova() {
        let (url, got, reply) = server();
        let (on_status, state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url.clone(), Some("velha".into()));
        uplink.publish(&flight(1.0));
        assert_eq!(got.recv_timeout(Duration::from_secs(10)).unwrap()["token"], "velha");
        reply.send(Reply::Close(4401)).unwrap();
        until_state(&state, UplinkState::NeedsLogin);
        reply.send(Reply::Drop).unwrap();
        uplink.publish(&flight(1.0));
        uplink.set_session(url, Some("nova".into()));
        assert_eq!(until(&got, "auth")["token"], "nova");
    }

    #[test]
    fn sessao_renovada_vai_na_mesma_ligacao() {
        let (url, got, reply) = server();
        let (on_status, _state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url.clone(), Some("a".into()));
        uplink.publish(&flight(1.0));
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        until(&got, "p");
        uplink.set_session(url, Some("b".into()));
        assert_eq!(until(&got, "token")["token"], "b");
    }

    #[test]
    fn o_voo_acaba_avisa_o_mapa_e_fecha() {
        let (url, got, reply) = server();
        let (on_status, state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url, Some("t".into()));
        uplink.publish(&flight(1.0));
        got.recv_timeout(Duration::from_secs(10)).unwrap();
        reply.send(Reply::Text(r#"{"t":"ok"}"#.into())).unwrap();
        until(&got, "p");
        uplink.flight_ended();
        until(&got, "off");
        until_state(&state, UplinkState::Off);
    }

    #[test]
    fn sem_voo_ou_sem_sessao_nao_liga() {
        let (url, got, _reply) = server();
        let (on_status, _state) = statuses();
        let uplink = Uplink::start(on_status);
        uplink.set_session(url.clone(), Some("t".into()));
        thread::sleep(Duration::from_millis(600));
        assert!(got.try_recv().is_err());
        uplink.set_session(url, None);
        uplink.publish(&flight(1.0));
        thread::sleep(Duration::from_millis(600));
        assert!(got.try_recv().is_err());
    }
}
