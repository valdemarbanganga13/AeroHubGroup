import { useCallback, useEffect, useState } from "react";
import ExternalLink from "../../components/ExternalLink";
import { LINKS } from "../../config/links";
import { useI18n } from "../../i18n/I18nProvider";
import {
  deleteAllStoredFlights,
  deleteStoredFlight,
  formatBytes,
  listStoredFlights,
  type StoredFlight,
} from "../../lib/storage";

// Armazenamento: os voos que o Feeder gravou neste PC (temporários) e quanto ocupam.
// - Cada voo: rota, avião, quando começou, quantos pontos, tamanho e o estado:
//   a gravar / em pausa (o mesmo voo pode continuar) / apagado sozinho daqui a X
// - Apagar um voo antes do prazo, ou todos (pede confirmação)
// - "Como funciona": tudo o que a pessoa precisa de saber, e o link para o artigo completo no site de suporte
// A lista atualiza-se de 5 em 5 segundos (o voo a ser gravado vai crescendo).

const REFRESH_MS = 5000;

export default function StoragePage() {
  const { t } = useI18n();
  const s = t.app.storage;
  const [flights, setFlights] = useState<StoredFlight[]>([]);
  const [confirmAll, setConfirmAll] = useState(false);

  const refresh = useCallback(() => {
    void listStoredFlights().then(setFlights);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const totalBytes = flights.reduce((sum, flight) => sum + flight.bytes, 0);

  async function remove(key: string) {
    await deleteStoredFlight(key);
    refresh();
  }

  async function removeAll() {
    await deleteAllStoredFlights();
    setConfirmAll(false);
    refresh();
  }

  return (
    <div className="page settings storage">
      <header className="page-header" data-tauri-drag-region>
        <h1 className="page-header__title">{t.app.nav.storage}</h1>
        <p className="page-header__subtitle">{s.subtitle}</p>
      </header>

      <div className="settings-scroll">
        <section className="settings-section">
          <h2 className="settings-section__title">{s.flights}</h2>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row__text">
                <p className="settings-row__title">{s.total(formatBytes(totalBytes), flights.length)}</p>
                <p className="settings-row__description">{s.flightsDescription}</p>
              </div>
              {flights.length > 0 &&
                (confirmAll ? (
                  <div className="storage-confirm">
                    <button className="btn btn-ghost storage-button" type="button" onClick={() => setConfirmAll(false)}>
                      {s.cancel}
                    </button>
                    <button className="btn btn-danger storage-button" type="button" onClick={() => void removeAll()}>
                      {s.confirmDeleteAll}
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-ghost storage-button" type="button" onClick={() => setConfirmAll(true)}>
                    {s.deleteAll}
                  </button>
                ))}
            </div>

            {flights.length === 0 ? (
              <p className="feeder-waiting">{s.empty}</p>
            ) : (
              flights.map((flight) => <FlightRow key={flight.key} flight={flight} onDelete={() => void remove(flight.key)} />)
            )}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{s.howTitle}</h2>
          <div className="settings-card">
            <ol className="feeder-steps">
              {s.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {/* Artigo completo no site de suporte */}
            <p className="feeder-guide">
              <ExternalLink href={LINKS.storageGuide}>{s.guide}</ExternalLink>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// "1 h 05 min" / "12 min" / "< 1 min"
function duration(ms: number) {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

function FlightRow({ flight, onDelete }: { flight: StoredFlight; onDelete: () => void }) {
  const { t, language } = useI18n();
  const s = t.app.storage;
  const route =
    flight.origin || flight.destination ? `${flight.origin ?? "n/a"} → ${flight.destination ?? "n/a"}` : s.freeFlight;
  const started = new Date(flight.startedAt).toLocaleString(language, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const state = flight.active
    ? s.recording
    : flight.expiresAt === null
      ? s.paused
      : s.deletesIn(duration(Math.max(0, flight.expiresAt - Date.now())));

  return (
    <div className="settings-row storage-flight">
      <div className="settings-row__text">
        <p className="settings-row__title">
          {flight.active && <span className="feeder-dot is-connected storage-flight__dot" aria-hidden="true" />}
          {route}
        </p>
        <p className="settings-row__description">
          {[flight.aircraft, flight.livery].filter(Boolean).join(" · ") || "n/a"}
        </p>
        <p className="settings-row__description">
          {started} · {duration(flight.lastAt - flight.startedAt)} · {s.points(flight.points)} ·{" "}
          <strong className="storage-flight__size">{formatBytes(flight.bytes)}</strong>
        </p>
        <p className={`storage-flight__state ${flight.active ? "is-active" : ""}`}>{state}</p>
      </div>
      <button className="btn btn-ghost storage-button" type="button" onClick={onDelete}>
        {flight.active ? s.delete : s.deleteNow}
      </button>
    </div>
  );
}
