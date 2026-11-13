import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Feeder: a ligação ao Infinite Flight corre na parte em Rust (src-tauri/src/feeder.rs).
// Aqui só se manda ligar/desligar e se recebem o estado e os dados do avião.

const isTauri = "__TAURI_INTERNALS__" in window;

export type FeederState = "off" | "searching" | "connected";

export type FeederStatus = {
  state: FeederState;
  device: string | null;
  address: string | null;
  error: string | null;
};

// Valores como chegam da Connect API v2 (unidades da API: velocidades em m/s, altitude em pés, rumo em radianos)
export type FeederData = {
  latitude?: number;
  longitude?: number;
  altitudeMsl?: number;
  altitudeAgl?: number;
  headingTrue?: number;
  groundSpeed?: number;
  indicatedAirspeed?: number;
  trueAirspeed?: number;
  mach?: number;
  // Temperatura lá fora (°C); vento de frente e de lado (m/s, de lado + = da direita)
  oat?: number;
  headwind?: number;
  crosswind?: number;
  // Vento do jogo onde está o avião: de onde vem (radianos, norte verdadeiro) e velocidade (m/s)
  windFromTrue?: number;
  windSpeed?: number;
  verticalSpeed?: number;
  onGround?: boolean;
  aircraft?: string;
  livery?: string;
  appState?: string;
  server?: string;
  // Plano de voo (lido de 10 em 10 segundos): partida, último ponto do plano, minutos e nm até ao destino
  planOrigin?: string;
  planDestination?: string;
  planCoordinates?: string;
  destinationEte?: number;
  destinationDist?: number;
  // Voo no jogo (número), desvio e indicativo (pedido uma vez por voo; ver feederCallsign.ts)
  flightId?: string;
  originalDestination?: string | null;
  divertedTo?: string | null;
  callsign?: string | null;
  // Descolagem e aterragem guardadas pelo app (ms); depois de aterrar o plano continua (planKept)
  takeoffAt?: number | null;
  landedAt?: number | null;
  planKept?: boolean;
};

export type PlanAirport = { code: string; name: string };
export type FlightPlan = { origin: PlanAirport | null; destination: PlanAirport | null };

// Aeroporto = código ICAO de 4 letras (o fim do plano pode ser só um waypoint, ex.: "BLH", e aí não é destino)
const ICAO = /^[A-Z0-9]{4}$/;

function airport(code: string | undefined): PlanAirport | null {
  const upper = (code ?? "").trim().toUpperCase();
  return ICAO.test(upper) ? { code: upper, name: "" } : null;
}

// Partida e chegada do plano de voo. Sem plano: null
export function parseFlightPlan(data: FeederData | null | undefined): FlightPlan | null {
  const plan = { origin: airport(data?.planOrigin), destination: airport(data?.planDestination) };
  return plan.origin || plan.destination ? plan : null;
}

const OFF: FeederStatus = { state: "off", device: null, address: null, error: null };

// O voo no AeroHub Radar (a parte em Rust envia-o para o servidor; ver src-tauri/src/feeder_uplink.rs)
export type UplinkState = "off" | "connecting" | "waiting" | "on_map" | "retrying" | "needs_login" | "not_verified" | "replaced";

export function useUplinkState() {
  const [state, setState] = useState<UplinkState>("off");
  useEffect(() => {
    if (!isTauri) return;
    const unlisten = listen<UplinkState>("feeder://uplink", (event) => setState(event.payload));
    return () => void unlisten.then((off) => off());
  }, []);
  return state;
}

// Escolhas da página Feeder (guardadas neste computador): modo de ligação, IP e atualizações por segundo
export type FeederMode = "auto" | "manual";
export type FeederPrefs = { mode: FeederMode; ip: string; rate: number };

const PREFS_KEY = "feeder";
export const DEFAULT_RATE = 4;

export function loadFeederPrefs(): FeederPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    const rate = Number.isInteger(saved.rate) && saved.rate >= 1 && saved.rate <= 10 ? saved.rate : DEFAULT_RATE;
    return { mode: saved.mode === "manual" ? "manual" : "auto", ip: typeof saved.ip === "string" ? saved.ip : "", rate };
  } catch {
    return { mode: "auto", ip: "", rate: DEFAULT_RATE };
  }
}

export function saveFeederPrefs(prefs: FeederPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Sem armazenamento: a escolha vale só até fechar o app
  }
}

// Dono da conta para o Feeder: o nome do Infinite Flight ligado à conta do AeroHub Radar, só se estiver
// VERIFICADO. Sem conta do Infinite Flight, ou sem verificação: "" (o Feeder não liga e não mostra nada).
export function feederOwner(account: { ifcUsername: string | null; ifcVerified: boolean } | null) {
  if (!account?.ifcVerified) return "";
  return account.ifcUsername?.trim() ?? "";
}

// O "aparelho de outra pessoa" chega no erro como "wrong_user:<nome>"
export function wrongUserOf(status: FeederStatus) {
  return status.error?.startsWith("wrong_user:") ? status.error.slice("wrong_user:".length) || "?" : null;
}

// ownerUser = nome do Infinite Flight ligado à conta do AeroHub Radar: só o Infinite Flight com esse
// utilizador é aceite (os aparelhos de outras pessoas na mesma rede são ignorados)
export function startFeeder(mode: FeederMode, ip: string, ownerUser: string) {
  if (!isTauri) return Promise.resolve();
  return invoke("feeder_start", { mode, ip, expectedUser: ownerUser });
}

// Quantas vezes por segundo o app lê os dados do Infinite Flight (1 a 10); muda na hora
export function setFeederRate(perSecond: number) {
  if (!isTauri) return Promise.resolve();
  return invoke("feeder_set_rate", { perSecond });
}

export function stopFeeder() {
  if (!isTauri) return Promise.resolve();
  return invoke("feeder_stop");
}

// Estado do Feeder agora (sem ficar a ouvir)
export function feederStatusNow() {
  if (!isTauri) return Promise.resolve(OFF);
  return invoke<FeederStatus>("feeder_status");
}

export function useFeeder() {
  const [status, setStatus] = useState<FeederStatus>(OFF);
  const [data, setData] = useState<FeederData | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    let alive = true;
    void invoke<FeederStatus>("feeder_status").then((s) => alive && setStatus(s));
    const unlisten = [
      listen<FeederStatus>("feeder://status", (event) => {
        setStatus(event.payload);
        if (event.payload.state !== "connected") setData(null);
      }),
      listen<FeederData>("feeder://data", (event) => setData(event.payload)),
    ];
    return () => {
      alive = false;
      unlisten.forEach((p) => void p.then((off) => off()));
    };
  }, []);

  return { status, data };
}
