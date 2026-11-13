import { useEffect, useMemo, useRef, useState } from "react";
import { parseFlightPlan, useFeeder, type FeederData } from "./feeder";
import type { LiveFlight, PilotState, Server } from "./flightStatus";
import { airlineIcaoForLivery } from "./airlines";

// Voo vindo do Feeder (ligação direta ao Infinite Flight), no mesmo formato do voo do servidor do Radar.
// Com o Feeder ligado, o Início mostra este voo; o Discord também, se "Mostrar no meu Discord" estiver ligado.
// A Connect API não dá o callsign nem o código da companhia: o código (para o logo) vem do nome da pintura.
//
// Tempo de voo e progresso (também quando o app liga a meio do voo):
// - Progresso = parte do plano já feita: 1 − (nm que faltam ÷ nm do plano todo, somando os pontos do plano).
// - Tempo de voo: se o app viu a descolagem, conta desde aí. Se ligou a meio do voo, estima-o pelo progresso
//   e pelos minutos que faltam (à velocidade atual): já feito = falta × progresso ÷ (1 − progresso).
// - Duração total = tempo já feito + minutos que faltam. Assim a barra do Início começa já no sítio certo
//   e o Discord mostra o tempo que falta.
// - A estimativa só muda se se desviar mais de 2 minutos (para o relógio não saltar a cada atualização).
// Altitude e velocidade vão para o Discord no máximo de 15 em 15 segundos (o Discord não aceita mudanças mais rápidas).

const RADAR_SITE = (import.meta.env.VITE_RADAR_SITE_URL as string | undefined) || "https://aerohubradar.com";
const SNAPSHOT_EVERY_MS = 15_000;
const MAX_DRIFT_MS = 2 * 60_000;
const KNOTS = 1.943844;
const EARTH_NM = 3440.065;

const SERVERS: Server[] = ["casual", "training", "expert"];

function serverOf(name: string | undefined): Server | null {
  const lower = (name ?? "").toLowerCase();
  return SERVERS.find((server) => lower.includes(server)) ?? null;
}

// "FL350 · 450 kts" (abaixo de 18 000 ft: "3200 ft"); no chão: "On ground"
function liveLine(data: FeederData, onGround: string) {
  if (data.onGround) return onGround;
  const altitude = data.altitudeMsl ?? 0;
  const level = altitude >= 18000 ? `FL${Math.round(altitude / 100)}` : `${Math.round(altitude / 100) * 100} ft`;
  return `${level} · ${Math.round((data.groundSpeed ?? 0) * KNOTS)} kts`;
}

// Comprimento do plano em nm: "lat,lon lat,lon …" (pontos do plano, pela ordem)
function planLengthNm(coordinates: string | undefined) {
  const points = (coordinates ?? "")
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [lat1, lon1] = points[i - 1].map((v) => (v * Math.PI) / 180);
    const [lat2, lon2] = points[i].map((v) => (v * Math.PI) / 180);
    const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
    total += 2 * EARTH_NM * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return total;
}

type Snapshot = { line: string; startedAt: number; durationMs: number | null };

export function useFeederPilot(onGroundText: string): PilotState | null {
  const { status, data } = useFeeder();
  const connected = status.state === "connected";
  const hasData = connected && data !== null;

  const latest = useRef<FeederData | null>(null);
  latest.current = data;
  // Início desta ligação e hora da descolagem (só se o app a viu)
  const connectedAt = useRef<number | null>(null);
  const takeoffAt = useRef<number | null>(null);
  const wasOnGround = useRef<boolean | null>(null);
  // Avião e pintura atuais: se mudarem (novo voo no jogo), o tempo de voo recomeça
  const flightKey = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  if (!hasData) {
    flightKey.current = null;
    connectedAt.current = null;
    takeoffAt.current = null;
    wasOnGround.current = null;
  } else {
    const key = `${data.aircraft ?? ""}|${data.livery ?? ""}`;
    if (flightKey.current !== null && flightKey.current !== key) {
      connectedAt.current = null;
      takeoffAt.current = null;
      wasOnGround.current = null;
    }
    flightKey.current = key;
    if (connectedAt.current === null) connectedAt.current = Date.now();
    // Descolou com o app ligado: o tempo de voo conta daqui
    if (wasOnGround.current === true && data.onGround === false) takeoffAt.current = Date.now();
    // No chão outra vez (aterrou ou voltou ao início): esquece a descolagem
    if (data.onGround === true) takeoffAt.current = null;
    wasOnGround.current = data.onGround ?? null;
  }

  const coordinates = data?.planCoordinates;
  const planNm = useMemo(() => planLengthNm(coordinates), [coordinates]);
  const planNmRef = useRef(0);
  planNmRef.current = planNm;

  useEffect(() => {
    if (!hasData) {
      setSnapshot(null);
      return;
    }
    const update = () => {
      const now = latest.current;
      if (!now) return;
      const time = Date.now();
      const eteMs = (now.destinationEte ?? 0) * 60_000;
      const remainingNm = now.destinationDist ?? 0;
      const hasPlan = !!parseFlightPlan(now)?.destination && (eteMs > 0 || !!now.landedAt);

      // O tempo de voo conta desde que entrou no voo (ligou o Feeder) até sair, com ou sem plano de voo — como no voo
      // do servidor. No chão antes de descolar, a duração é "tempo já passado + ETE", por isso o tempo que falta não desce.
      // (se o Feeder souber de uma descolagem antes de o app ligar, conta dessa, que é mais cedo)
      let startedAt = Math.min(connectedAt.current ?? time, now.takeoffAt ?? Infinity);
      if (!now.onGround && !now.takeoffAt && takeoffAt.current === null && hasPlan && planNmRef.current > 0 && !now.landedAt) {
        // Ligou a meio do voo: estima o tempo já feito pelo progresso no plano
        const progress = Math.min(0.995, Math.max(0, 1 - remainingNm / planNmRef.current));
        startedAt = time - (eteMs * progress) / (1 - progress);
      }

      setSnapshot((previous) => {
        // Pequenas diferenças não mexem no relógio
        const keep = previous && Math.abs(previous.startedAt - startedAt) < MAX_DRIFT_MS && !now.onGround;
        const start = Math.round(keep && previous ? previous.startedAt : startedAt);
        // Aterrou: a duração fica a da aterragem (barra cheia, sem tempo a faltar)
        const durationMs = now.landedAt
          ? Math.max(1, Math.round(now.landedAt - start))
          : hasPlan
            ? Math.round(time - start + eteMs)
            : null;
        return { line: liveLine(now, onGroundText), startedAt: start, durationMs };
      });
    };
    update();
    const timer = window.setInterval(update, SNAPSHOT_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [hasData, onGroundText]);

  const aircraft = data?.aircraft ?? "";
  const callsign = data?.callsign ?? "";
  const livery = data?.livery ?? "";
  const server = serverOf(data?.server);
  const plan = useMemo(
    () => parseFlightPlan({ planOrigin: data?.planOrigin, planDestination: data?.planDestination }),
    [data?.planOrigin, data?.planDestination],
  );
  const originCode = plan?.origin?.code ?? "";
  const destCode = plan?.destination?.code ?? "";

  return useMemo(() => {
    if (!hasData || !snapshot || !server) return null;
    const route = originCode && destCode;
    const flight: LiveFlight = {
      status: "flying",
      aircraft,
      airline: { icao: airlineIcaoForLivery(livery), name: livery.split(" - ")[0].trim() },
      callsign: callsign,
      flightUrl: RADAR_SITE,
      // Sem os dois aeroportos: "Free flight" (como no voo do servidor)
      origin: route ? { code: originCode, city: "" } : null,
      destination: route ? { code: destCode, city: "" } : null,
      server,
      startedAt: snapshot.startedAt,
      estimatedDurationMs: route ? snapshot.durationMs : null,
      liveLine: snapshot.line,
    };
    return { status: "flying", server, callsign: callsign || null, flight };
  }, [hasData, snapshot, server, aircraft, livery, originCode, destCode, callsign]);
}
