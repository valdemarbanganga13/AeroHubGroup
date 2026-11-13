import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";

// Estado do voo REAL, vindo do servidor do AeroHub Radar (tabela flight_status no Supabase).
//
// O servidor de status (lê o Infinite Flight 24/7) escreve uma linha por piloto; o app só lê a sua
// (só com licença válida, regra do servidor) e recebe as mudanças na hora (Supabase Realtime).
// Assim, quando o servidor começar a funcionar, os voos aparecem sem ser preciso atualizar o app.
//
// Sem linha, sem servidor ou com dados velhos (servidor parado): "No status available".

export type FlightStatus = "flying" | "online" | "offline";
export type Server = "casual" | "training" | "expert";

// Voo em curso (o que aparece no Início, no Discord e na mini janela).
// O tempo de voo conta no próprio app a partir de startedAt (de segundo a segundo, sem limite);
// o servidor só escreve quando algo muda. Sem plano de voo: origin/destination vazios e sem hora prevista.
export type LiveFlight = {
  status: "flying";
  aircraft: string;
  // Companhia: código ICAO de 3 letras (o logo está em public/airline-logos/<ICAO>.png)
  airline: { icao: string; name: string };
  callsign: string;
  // Página deste voo no AeroHub Radar (linha da rota e botão "Ver voo" no Discord)
  flightUrl: string;
  origin: { code: string; city: string } | null;
  destination: { code: string; city: string } | null;
  server: Server;
  startedAt: number;
  // Duração prevista (barra de progresso e tempo restante); null = sem hora de chegada (só conta o tempo)
  estimatedDurationMs: number | null;
  // Só com o Feeder: altitude e velocidade (ex.: "FL350 · 450 kts"), mostradas no Discord ao lado do servidor
  liveLine?: string;
};

// "LPPT → KJFK · Boeing 737-800"; sem plano de voo: "Free flight · Boeing 737-800"
export function routeLine(flight: LiveFlight, freeFlight: string) {
  const route =
    flight.origin && flight.destination ? `${flight.origin.code} → ${flight.destination.code}` : freeFlight;
  return flight.aircraft ? `${route} · ${flight.aircraft}` : route;
}

// Estado do piloto: offline / online (ligado, sem voo) / a voar (com o voo, se o servidor tiver os dados todos)
export type PilotState = {
  status: FlightStatus;
  server: Server | null;
  callsign: string | null;
  flight: LiveFlight | null;
};

type FlightStatusRow = {
  user_id: string;
  status: FlightStatus;
  server: Server | null;
  callsign: string | null;
  aircraft: string | null;
  airline_icao: string | null;
  airline_name: string | null;
  origin_icao: string | null;
  origin_city: string | null;
  destination_icao: string | null;
  destination_city: string | null;
  flight_url: string | null;
  started_at: string | null;
  estimated_arrival_at: string | null;
  updated_at: string;
};

// O servidor atualiza a linha pelo menos de minuto a minuto; mais velha do que isto = servidor parado
const STALE_MS = 5 * 60 * 1000;
const POLL_MS = 60 * 1000;
const RADAR_SITE = (import.meta.env.VITE_RADAR_SITE_URL as string | undefined) || "https://aerohubradar.com";

function toPilotState(row: FlightStatusRow): PilotState {
  const startedAt = row.started_at ? Date.parse(row.started_at) : NaN;
  const arrivesAt = row.estimated_arrival_at ? Date.parse(row.estimated_arrival_at) : NaN;
  // A voar com hora de início: já há voo (com ou sem plano de voo)
  const hasFlight = row.status === "flying" && Number.isFinite(startedAt);
  const hasArrival = Number.isFinite(arrivesAt) && arrivesAt > startedAt;

  return {
    status: row.status,
    server: row.server,
    callsign: row.callsign,
    flight: hasFlight
      ? {
          status: "flying",
          aircraft: row.aircraft ?? "",
          airline: { icao: (row.airline_icao ?? "").toUpperCase(), name: row.airline_name ?? "" },
          callsign: row.callsign ?? "",
          flightUrl: row.flight_url || RADAR_SITE,
          origin: row.origin_icao ? { code: row.origin_icao, city: row.origin_city ?? "" } : null,
          destination: row.destination_icao ? { code: row.destination_icao, city: row.destination_city ?? "" } : null,
          server: row.server ?? "casual",
          startedAt,
          estimatedDurationMs: hasArrival ? arrivesAt - startedAt : null,
        }
      : null,
  };
}

// Estado do voo da conta com sessão iniciada (null = sem status disponível)
export function useFlightStatus(): PilotState | null {
  const [row, setRow] = useState<FlightStatusRow | null>(null);
  // Muda a cada verificação, para voltar a ver se os dados ficaram velhos
  const [checkedAt, setCheckedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return null;
      if (!session) {
        setRow(null);
        return null;
      }
      const { data, error } = await supabase
        .from("flight_status")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      // Erro (sem internet, tabela ainda não criada…): fica como está
      if (!cancelled && !error) setRow((data as FlightStatusRow | null) ?? null);
      if (!cancelled) setCheckedAt(Date.now());
      return session.user.id;
    };

    void load().then((userId) => {
      if (cancelled || !userId) return;
      // Mudanças na hora (o servidor escreveu um estado novo)
      channel = supabase
        .channel(`flight-status-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "flight_status", filter: `user_id=eq.${userId}` },
          (payload) => {
            setRow(payload.eventType === "DELETE" ? null : (payload.new as FlightStatusRow));
            setCheckedAt(Date.now());
          },
        )
        .subscribe();
    });
    // De minuto a minuto: volta a ler (se o tempo real falhar) e confirma que os dados não ficaram velhos
    const timer = window.setInterval(() => void load(), POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  // O mesmo objeto enquanto os dados não mudam (para não reenviar o status ao Discord sem razão)
  const rowKey = row ? JSON.stringify(row) : "";
  const stale = !row || checkedAt - Date.parse(row.updated_at) > STALE_MS;
  return useMemo(() => (row && !stale ? toPilotState(row) : null), [rowKey, stale]);
}
