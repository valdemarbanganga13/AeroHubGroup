import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { supabase, supabaseConfigured } from "./supabase";
import { useFeeder } from "./feeder";

// Indicativo (callsign) do voo para o Feeder. A ligação ao jogo não o dá, por isso pergunta-se à função
// feeder-callsign do AeroHub Radar (lista de voos ao vivo da Live API, só a própria conta verificada).
// A resposta vai para a parte em Rust, que a guarda só durante esse voo e a envia com os dados.
//
// Quando se pergunta (para não carregar a Live API):
// - Uma vez por voo (cada voo do jogo tem o seu número; trocar de indicativo no jogo = voo novo).
//   Também se pergunta uma vez quando o app abre a meio de um voo, mesmo com um indicativo já guardado
//   (confirma que está certo).
// - O voo acabou de começar e ainda não aparece na Live API: tenta outra vez aos 20 s, 40 s, 1 min, 2 min
//   e depois de 5 em 5 minutos, até o encontrar ou o voo acabar. Encontrou: não pergunta mais.
// - Do lado da função, a lista de voos de cada servidor é partilhada por todos os pilotos durante 20 s.
// - O número do voo do jogo não é o mesmo da Live API: a função encontra o voo pelo piloto e pela posição
//   (vai a posição atual do avião no pedido).

const RETRY_AFTER_MS = [20_000, 40_000, 60_000, 120_000];
const RETRY_EVERY_MS = 5 * 60_000;
const isTauri = "__TAURI_INTERNALS__" in window;

type Asked = { flightId: string; tries: number; nextAt: number; done: boolean };

export function useFeederCallsign(enabled: boolean) {
  const { status, data } = useFeeder();
  const asked = useRef<Asked>({ flightId: "", tries: 0, nextAt: 0, done: false });
  const busy = useRef(false);

  const flightId = data?.flightId ?? "";
  const server = data?.server ?? "";
  const connected = status.state === "connected";

  useEffect(() => {
    if (!isTauri || !supabaseConfigured || !enabled || !connected || !flightId || busy.current) return;
    if (asked.current.flightId !== flightId) asked.current = { flightId, tries: 0, nextAt: 0, done: false };
    const state = asked.current;
    const now = Date.now();
    if (state.done || now < state.nextAt) return;
    state.tries += 1;
    state.nextAt = now + (RETRY_AFTER_MS[state.tries - 1] ?? RETRY_EVERY_MS);
    busy.current = true;
    void supabase.functions
      .invoke<{ callsign?: string }>("feeder-callsign", {
        body: { flightId, server, latitude: data?.latitude, longitude: data?.longitude },
      })
      .then(({ data: answer }) => {
        if (!answer?.callsign || asked.current.flightId !== flightId) return;
        asked.current.done = true;
        return invoke("feeder_set_callsign", { flightId, callsign: answer.callsign });
      })
      .catch(() => {})
      .finally(() => {
        busy.current = false;
      });
  }, [enabled, connected, flightId, server, data]);
}
