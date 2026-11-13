import { useState } from "react";
import LogoIcon from "./brand/LogoIcon";
import { useI18n } from "../i18n/I18nProvider";
import { AIRLINE_NO_LOGO, airlineLogoLocal } from "../lib/airlines";
import { formatDuration } from "../lib/time";
import { routeLine, type LiveFlight } from "../lib/flightStatus";
import "./discordPresenceCard.css";

// Cartão com o status como aparece no Discord (logo AeroHub + logo da companhia no canto,
// rota e avião, servidor e tempo restante). Usado na página Início e na mini janela.

type DiscordPresenceCardProps = {
  flight: LiveFlight;
  // Hora atual (para o tempo restante ir contando)
  now: number;
};

export default function DiscordPresenceCard({ flight, now }: DiscordPresenceCardProps) {
  const { t } = useI18n();
  // Com hora de chegada: tempo restante; sem ela: tempo a contar desde o início (como no Discord)
  const time =
    flight.estimatedDurationMs !== null
      ? t.app.home.remaining(formatDuration(flight.startedAt + flight.estimatedDurationMs - now))
      : t.app.home.elapsed(formatDuration(now - flight.startedAt));
  // Logo que falhou a carregar (companhia sem logo). Fica ligado à companhia: quando ela muda (ex.: o voo começa
  // sem companhia e ela chega depois, ou outro voo), tenta outra vez em vez de ficar preso no "sem logo"
  const icao = flight.airline.icao;
  const [failedIcao, setFailedIcao] = useState<string | null>(null);
  const noLogo = !icao || failedIcao === icao;

  return (
    <div className="presence-card">
      <div className="presence-card__images">
        <div className="presence-card__image logo-static">
          <LogoIcon />
        </div>
        <img
          className={`presence-card__airline ${noLogo ? "is-no-logo" : ""}`}
          src={noLogo ? AIRLINE_NO_LOGO : airlineLogoLocal(icao)}
          alt={flight.airline.name}
          title={flight.airline.name}
          onError={() => setFailedIcao(icao)}
        />
      </div>
      <div className="presence-card__text">
        <p className="presence-card__playing">
          {t.app.home.playing} <strong>Infinite Flight</strong>
        </p>
        <p>{routeLine(flight, t.app.home.freeFlight)}</p>
        <p>
          {t.app.home.presenceServer(t.app.home.servers[flight.server])} · {time}
        </p>
      </div>
    </div>
  );
}
