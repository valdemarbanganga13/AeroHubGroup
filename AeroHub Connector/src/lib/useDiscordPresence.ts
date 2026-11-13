import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { LINKS } from "../config/links";
import { useI18n } from "../i18n/I18nProvider";
import { routeLine, type LiveFlight } from "./flightStatus";
import { SETTINGS_CHANGED_EVENT, loadSettings } from "./settings";
import { airlineLogoUrlForDiscord } from "./airlines";
import { clearDiscordPresence, setDiscordPresence, type DiscordPresence } from "./discord";

// Mantém o status do voo no Discord enquanto o app (parte principal) está aberto:
//   A jogar Infinite Flight
//   [logo AeroHub + logo da companhia]  LPPT → KJFK · Boeing 737-800
// Linha da rota e botão "Ver voo" → o voo no AeroHub Radar; botão do Discord → Discord do Radar;
// logo grande → site do AeroHub Connector (o nome do jogo leva ao site pelo Developer Portal).
//                                       Servidor Expert
//                                       1:20:00 restante
//   [Ver voo no AeroHub Radar]  [Entrar no Discord AeroHub Radar]
// Se o Discord ainda não estiver aberto, tenta outra vez de tempos a tempos.
// Ao sair (ex.: terminar sessão), tira o status.
// O voo vem do servidor do AeroHub Radar (src/lib/flightStatus.ts); sem voo, nada no Discord.
// Piloto automático (Definições, ligado por defeito): sempre que há voo (do Feeder ou do servidor) e o Discord está
// fechado, o app abre-o — no máximo uma vez a cada 2 minutos (o Discord demora a arrancar). Assim, com o PC em casa
// ligado e o app aberto, o status aparece mesmo que a pessoa esteja a voar noutro sítio.

const RETRY_MS = 15_000;
const OPEN_EVERY_MS = 2 * 60_000;
// Fora do hook: a última vez que o app mandou abrir o Discord (vale para todos os voos)
let lastOpenAt = 0;

// O Discord recusa botões e links que não sejam https públicos (ex.: o Radar local em localhost)
function publicUrl(url: string) {
  return /^https:\/\//.test(url) && !/localhost|127\.0\.0\.1/.test(url) ? url : LINKS.aerohubRadar;
}

const isTauri = "__TAURI_INTERNALS__" in window;

// flight = null: sem voo (nada no Discord)
export function useDiscordPresence(flight: LiveFlight | null) {
  const { t } = useI18n();
  // "No Discord mostrar" (página Feeder): tempo que falta ou tempo de voo; muda na hora
  const [discordTime, setDiscordTime] = useState(() => loadSettings().discordTime);
  useEffect(() => {
    const read = () => setDiscordTime(loadSettings().discordTime);
    window.addEventListener(SETTINGS_CHANGED_EVENT, read);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, read);
  }, []);

  useEffect(() => {
    if (!flight || flight.status !== "flying") {
      void clearDiscordPresence().catch(() => {});
      return;
    }

    const presence: DiscordPresence = {
      details: routeLine(flight, t.app.home.freeFlight),
      detailsUrl: publicUrl(flight.flightUrl),
      // "Expert Server · TAP123 · FL350 · 450 kts" (o indicativo só quando se sabe)
      state: [t.app.home.presenceServer(t.app.home.servers[flight.server]), flight.callsign, flight.liveLine]
        .filter(Boolean)
        .join(" · "),
      // O Discord só aceita números inteiros
      startedAt: Math.round(flight.startedAt),
      // Com hora de chegada (e a escolha "tempo que falta") o Discord mostra o tempo restante;
      // senão, o tempo a contar desde o início
      endsAt:
        flight.estimatedDurationMs !== null && discordTime === "remaining"
          ? Math.round(flight.startedAt + flight.estimatedDurationMs)
          : undefined,
      largeText: "AeroHub Connector",
      largeUrl: LINKS.connectorWebsite,
      smallText: flight.airline.name,
      buttons: [
        { label: t.app.home.presenceButton, url: publicUrl(flight.flightUrl) },
        { label: t.app.home.presenceDiscordButton, url: LINKS.social.discord },
      ],
    };

    let retry: number | undefined;
    let cancelled = false;
    const send = () => {
      setDiscordPresence(presence).catch((error) => {
        console.warn("[Discord]", error);
        // Discord fechado: o piloto automático abre-o (de novo, se continuar fechado, passados 2 minutos)
        if (isTauri && loadSettings().discordAutopilot && Date.now() - lastOpenAt >= OPEN_EVERY_MS) {
          lastOpenAt = Date.now();
          void openUrl("discord://").catch(() => {});
        }
        if (!cancelled) retry = window.setTimeout(send, RETRY_MS);
      });
    };
    // Logo da companhia (ou o ícone "sem logo") antes de enviar
    void airlineLogoUrlForDiscord(flight.airline.icao).then((logoUrl) => {
      if (cancelled) return;
      presence.smallImage = logoUrl;
      send();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
    };
  }, [flight, t, discordTime]);

  // Ao sair do app, o status sai do Discord
  useEffect(() => () => void clearDiscordPresence().catch(() => {}), []);
}
