import { useEffect, useState } from "react";
import AppFooter from "../../components/AppFooter";
import DiscordPresenceCard from "../../components/DiscordPresenceCard";
import { useI18n } from "../../i18n/I18nProvider";
import { formatDuration, useNow } from "../../lib/time";
import { useAccount } from "../../lib/account";
import type { LiveFlight, PilotState } from "../../lib/flightStatus";

// Início: estado (a voar / online / offline), o voo atual e como aparece no Discord.
// O estado vem do servidor do AeroHub Radar (src/lib/flightStatus.ts):
//   - sem dados: "No status available";
//   - offline / online: só o cartão do estado;
//   - a voar: o voo (rota, avião, servidor, tempo) e a pré-visualização do Discord.
// O botão ⧉ na pré-visualização põe o cartão numa mini janela por cima de tudo (Picture-in-Picture).
// No fundo: termos do AeroHub Connector e redes sociais.

type HomePageProps = {
  // null = sem status disponível
  pilot: PilotState | null;
  onPictureInPicture: () => void;
};

export default function HomePage({ pilot, onPictureInPicture }: HomePageProps) {
  const { t } = useI18n();
  const { account } = useAccount();
  const firstName = account?.displayName.split(" ")[0] ?? "";

  return (
    <div className="page home">
      <header className="page-header" data-tauri-drag-region>
        <h1 className="page-header__title">{t.app.home.title}</h1>
        <p className="page-header__subtitle">{t.app.home.greeting(firstName)}</p>
      </header>

      {pilot ? (
        <>
          {/* Estado */}
          <section className={`status-card is-${pilot.status}`}>
            <span className="status-card__dot" aria-hidden="true" />
            <div className="status-card__text">
              <p className="status-card__title">{t.app.home.status[pilot.status]}</p>
              <p className="status-card__detail">{t.app.home.statusDetail[pilot.status]}</p>
            </div>
            {pilot.callsign && <span className="status-card__callsign">{pilot.callsign}</span>}
          </section>

          {pilot.flight && <CurrentFlight flight={pilot.flight} onPictureInPicture={onPictureInPicture} />}
        </>
      ) : (
        // Sem status disponível (ainda sem dados do servidor)
        <section className="no-status">
          <span className="no-status__icon" aria-hidden="true">
            <FlightIcon />
          </span>
          <p className="no-status__title">{t.app.home.noStatusTitle}</p>
          <p className="no-status__text">{t.app.home.noStatusText}</p>
        </section>
      )}

      <AppFooter />
    </div>
  );
}

// Voo em curso: rota com progresso, avião, servidor, tempo de voo e como aparece no Discord
function CurrentFlight({ flight, onPictureInPicture }: { flight: LiveFlight; onPictureInPicture: () => void }) {
  const { t } = useI18n();
  const now = useNow();

  // O tempo de voo conta sempre (desde o início, sem limite); a barra só enche se houver hora de chegada
  const elapsedMs = now - flight.startedAt;
  const elapsed = formatDuration(elapsedMs);
  const hasArrival = flight.estimatedDurationMs !== null;
  const progress = hasArrival
    ? Math.min(100, Math.max(0, (elapsedMs / (flight.estimatedDurationMs as number)) * 100))
    : 50;

  // A barra da rota enche a partir do zero quando a página abre
  const [routeReady, setRouteReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setRouteReady(true), 60);
    return () => window.clearTimeout(timer);
  }, []);
  const shownProgress = routeReady ? progress : 0;
  // Sem plano de voo: "—" e "No flight plan" no lugar dos aeroportos que faltam
  const origin = flight.origin ?? { code: "—", city: t.app.home.noFlightPlan };
  const destination = flight.destination ?? { code: "—", city: t.app.home.noFlightPlan };

  return (
    <>
      {/* Voo atual */}
      <section className="flight-card">
        <div className="flight-route">
          <div className="flight-route__airport">
            <span className="flight-route__code">{origin.code}</span>
            <span className="flight-route__city">{origin.city}</span>
          </div>
          {/* Progresso do voo: a barra enche e o avião vai à frente */}
          <div
            className="flight-route__progress"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {hasArrival && <div className="flight-route__fill" style={{ width: `${shownProgress}%` }} />}
            <span className="flight-route__plane" style={{ left: `${shownProgress}%` }}>
              <FlightIcon />
            </span>
          </div>
          <div className="flight-route__airport flight-route__airport--end">
            <span className="flight-route__code">{destination.code}</span>
            <span className="flight-route__city">{destination.city}</span>
          </div>
        </div>

        <dl className="flight-stats">
          <div>
            <dt>{t.app.home.aircraft}</dt>
            <dd>{flight.aircraft}</dd>
          </div>
          <div>
            <dt>{t.app.home.server}</dt>
            <dd>
              <span className={`server-badge is-${flight.server}`}>{t.app.home.servers[flight.server]}</span>
            </dd>
          </div>
          <div>
            <dt>{t.app.home.flightTime}</dt>
            <dd className="flight-stats__time">{elapsed}</dd>
          </div>
        </dl>
      </section>

      {/* Como aparece no Discord */}
      <section className="discord-preview">
        <div className="discord-preview__header">
          <p className="discord-preview__label">{t.app.home.discordPreview}</p>
          <button
            className="discord-preview__pip has-tooltip"
            type="button"
            aria-label={t.app.home.pip}
            onClick={onPictureInPicture}
          >
            <PictureInPictureIcon />
            <span className="ui-tooltip ui-tooltip--left">{t.app.home.pip}</span>
          </button>
        </div>
        <DiscordPresenceCard flight={flight} now={now} />
      </section>
    </>
  );
}

// Ícone de Picture-in-Picture (janela com uma mini janela no canto)
function PictureInPictureIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="9.5" width="5.5" height="4.5" rx="1" fill="currentColor" />
    </svg>
  );
}

// Ícone do avião (fonte: public/icons/flight.svg), com o azul do logo um pouco mais escuro
function FlightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="flight-icon-blue" x1="12" y1="23" x2="12" y2="1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0062B8" />
          <stop offset="1" stopColor="#1F7FD6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#flight-icon-blue)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.593 14.043c-1.43.078-5.041-.079-5.041-.079S10.382 23.078 9.404 23a18 18 0 0 1-1.956-.315s4.514-8.957 3.386-8.878c-1.129.078-6.094-.157-6.094-.157s-2.784 3.614-3.085 3.535c-.3 0-1.655-.157-1.655-.157S1.58 12.943 1.58 12v-.079C1.58 10.978 0 6.893 0 6.893s1.279-.157 1.655-.157c.301 0 3.16 3.535 3.16 3.535s4.966-.236 6.094-.157-3.385-8.878-3.385-8.878.902-.157 1.88-.236c.978.079 7.223 9.193 7.223 9.193s3.611-.079 5.04-.079c1.43.079 2.333 1.964 2.333 1.964-.075.158-.978 1.965-2.407 1.965"
      />
    </svg>
  );
}
