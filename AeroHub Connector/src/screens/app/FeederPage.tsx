import { useEffect, useRef, useState } from "react";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import ExternalLink from "../../components/ExternalLink";
import { LINKS } from "../../config/links";
import { useI18n } from "../../i18n/I18nProvider";
import { useSettings } from "../../lib/settings";
import { useAccount } from "../../lib/account";
import {
  feederOwner,
  loadFeederPrefs,
  parseFlightPlan,
  saveFeederPrefs,
  setFeederRate,
  startFeeder,
  stopFeeder,
  useFeeder,
  useUplinkState,
  wrongUserOf,
  type FeederData,
} from "../../lib/feeder";

// Feeder: liga o app ao Infinite Flight (Connect API) para mandar a posição do avião para o AeroHub Radar.
// - Estado: desligado, a procurar, ligado
// - Ligação automática: o app procura o Infinite Flight na mesma rede Wi-Fi (o jogo anuncia-se na porta 15000)
// - Ligação manual: escreve-se o IP do aparelho onde corre o Infinite Flight (porta 10112)
// - Mostrar no meu Discord: o voo do Feeder vai para o Discord (o Início mostra-o sempre)
// - Atualizações por segundo (1 a 10): mais = mais suave, menos = mais leve para o aparelho; muda na hora
// - Ligar automaticamente: ao abrir o app, o Feeder começa sozinho (ver AppShell)
// - Só o dono da conta: o app só aceita o Infinite Flight com o utilizador ligado à conta do AeroHub Radar
//   (sem esse nome na conta, não liga); aparelhos de outras pessoas na mesma rede são ignorados
// A ligação corre em Rust (src-tauri/src/feeder.rs) e continua mesmo saindo desta página.
// Por agora os dados só aparecem aqui ("Dados ao vivo"); ainda não vão para o mapa do Radar.

const API_PORT = 10112;
const IP_PATTERN = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

const RATES = Array.from({ length: 10 }, (_, i) => String(i + 1));

export default function FeederPage() {
  const { t } = useI18n();
  const f = t.app.feeder;
  const [prefs, setPrefs] = useState(loadFeederPrefs);
  const { account } = useAccount();
  // Só com o Infinite Flight da conta verificado (sem isso, nada funciona)
  const ownerUser = feederOwner(account);
  const noIfcText = account?.ifcUsername ? f.detail.notVerified : f.detail.noIfcUser;
  const [settings, updateSettings] = useSettings();
  const { status, data } = useFeeder();
  const uplink = useUplinkState();
  const state = status.state;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveFeederPrefs(prefs);
  }, [prefs]);

  // O Rust fica sempre com o ritmo escolhido (também ao abrir o app)
  useEffect(() => {
    void setFeederRate(prefs.rate);
  }, [prefs.rate]);

  const locked = state !== "off";
  const ipValid = IP_PATTERN.test(prefs.ip.trim());
  const canConnect = !!ownerUser && (prefs.mode === "auto" || ipValid);
  const otherUser = wrongUserOf(status);

  function connect() {
    if (!canConnect) {
      inputRef.current?.focus();
      return;
    }
    void startFeeder(prefs.mode, prefs.ip.trim(), ownerUser);
  }

  const detail = !ownerUser
    ? noIfcText
    : state === "searching"
      ? prefs.mode === "auto"
        ? f.detail.searchingAuto(ownerUser)
        : f.detail.searchingManual(prefs.ip.trim())
      : state === "connected"
        ? f.detail.connectedTo(ownerUser, status.device ?? status.address ?? "Infinite Flight")
        : f.detail.off(ownerUser);

  return (
    <div className="page settings feeder">
      <header className="page-header" data-tauri-drag-region>
        <h1 className="page-header__title">{t.app.nav.feeder}</h1>
        <p className="page-header__subtitle">{f.subtitle}</p>
      </header>

      <div className="settings-scroll">
        <section className="settings-section">
          <h2 className="settings-section__title">{f.status}</h2>
          <div className="settings-card">
            <div className="settings-row feeder-status">
              <div className="feeder-status__main">
                <span className={`feeder-dot is-${state}`} aria-hidden="true" />
                <div className="settings-row__text">
                  <p className="settings-row__title">{f.states[state]}</p>
                  <p className="settings-row__description">{detail}</p>
                  {state === "connected" && (
                    <p className="settings-row__description">{data && uplink === "off" ? f.radar.idle : f.radar[uplink]}</p>
                  )}
                  {state === "searching" && otherUser && (
                    <p className="feeder-other-user">{f.detail.otherUser(otherUser)}</p>
                  )}
                </div>
              </div>
              {state === "off" ? (
                <button className="btn btn-primary feeder-button" type="button" disabled={!ownerUser} onClick={connect}>
                  {f.connect}
                </button>
              ) : (
                <button className="btn btn-ghost feeder-button" type="button" onClick={() => void stopFeeder()}>
                  {state === "searching" ? f.cancel : f.disconnect}
                </button>
              )}
            </div>
          </div>
        </section>

        {state === "connected" && (
          <section className="settings-section">
            <h2 className="settings-section__title">{f.live.title}</h2>
            <div className="settings-card">
              {data ? <LiveData data={data} /> : <p className="feeder-waiting">{f.live.waiting}</p>}
            </div>
          </section>
        )}

        <section className="settings-section">
          <h2 className="settings-section__title">{f.connection}</h2>
          {/* Ligado ou a procurar: o modo e o IP ficam mesmo bloqueados (inert: nada reage ao rato nem ao teclado) */}
          <div className={`settings-card ${locked ? "is-locked" : ""}`} inert={locked}>
            <div className="settings-row">
              <div className="settings-row__text">
                <p className="settings-row__title">{f.mode}</p>
                <p className="settings-row__description">
                  {prefs.mode === "auto" ? f.modeAutoDescription : f.modeManualDescription}
                </p>
              </div>
              <Select
                value={prefs.mode}
                options={[
                  { value: "auto", label: f.modes.auto },
                  { value: "manual", label: f.modes.manual },
                ]}
                onChange={(mode) => setPrefs((p) => ({ ...p, mode }))}
              />
            </div>

            {prefs.mode === "manual" && (
              <div className="settings-row">
                <div className="settings-row__text">
                  <p className="settings-row__title">{f.ip}</p>
                  <p className="settings-row__description">{f.ipDescription(API_PORT)}</p>
                </div>
                <input
                  ref={inputRef}
                  className={`feeder-input ${prefs.ip && !ipValid ? "is-invalid" : ""}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="192.168.1.20"
                  spellCheck={false}
                  value={prefs.ip}
                  onChange={(event) => setPrefs((p) => ({ ...p, ip: event.target.value.replace(/[^\d.]/g, "") }))}
                  onKeyDown={(event) => event.key === "Enter" && connect()}
                />
              </div>
            )}
          </div>
          {locked && <p className="feeder-locked-hint">{f.lockedHint}</p>}
        </section>

        {/* Fora do cartão da ligação: dá para mudar mesmo ligado */}
        <section className="settings-section">
          <h2 className="settings-section__title">{f.updates}</h2>
          <div className="settings-card">
            <label className="settings-row settings-row--toggle">
              <div className="settings-row__text">
                <p className="settings-row__title">{f.autoStart}</p>
                <p className="settings-row__description">{f.autoStartDescription}</p>
              </div>
              <Toggle
                checked={settings.feederAutoStart}
                onChange={(feederAutoStart) => updateSettings({ feederAutoStart })}
              />
            </label>

            <label className="settings-row settings-row--toggle">
              <div className="settings-row__text">
                <p className="settings-row__title">{f.discord}</p>
                <p className="settings-row__description">{f.discordDescription}</p>
              </div>
              <Toggle
                checked={settings.feederDiscord}
                onChange={(feederDiscord) => updateSettings({ feederDiscord })}
              />
            </label>

            {/* Só conta com "Mostrar no meu Discord" ligado */}
            <div className={`settings-row ${settings.feederDiscord ? "" : "is-disabled"}`} inert={!settings.feederDiscord}>
              <div className="settings-row__text">
                <p className="settings-row__title">{f.discordTime}</p>
                <p className="settings-row__description">{f.discordTimeDescription}</p>
              </div>
              <Select
                value={settings.discordTime}
                options={[
                  { value: "remaining", label: f.discordTimes.remaining },
                  { value: "elapsed", label: f.discordTimes.elapsed },
                ]}
                onChange={(discordTime) => updateSettings({ discordTime })}
              />
            </div>
            <div className="settings-row">
              <div className="settings-row__text">
                <p className="settings-row__title">{f.rate}</p>
                <p className="settings-row__description">{f.rateDescription}</p>
              </div>
              {/* Lista comprida: abre para cima (para baixo deixava espaço vazio no fim da página) */}
              <Select
                placement="top"
                value={String(prefs.rate)}
                options={RATES.map((value) => ({ value, label: f.rateOption(Number(value)) }))}
                onChange={(value) => setPrefs((p) => ({ ...p, rate: Number(value) }))}
              />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{f.howTo}</h2>
          <div className="settings-card">
            <ol className="feeder-steps">
              {f.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {/* Guia completo (com imagens) no site de suporte */}
            <p className="feeder-guide">
              <ExternalLink href={LINKS.feederGuide}>{f.guide}</ExternalLink>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Converte as unidades da API (m/s, radianos) para as da aviação (nós, graus, pés por minuto)
const KNOTS = 1.943844;
const FPM = 196.8504;

function LiveData({ data }: { data: FeederData }) {
  const { t } = useI18n();
  const l = t.app.feeder.live;
  const n = (value: number | undefined, digits = 0) =>
    value === undefined || Number.isNaN(value)
      ? "n/a"
      : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const plan = parseFlightPlan(data);
  const route = plan ? `${plan.origin?.code ?? "n/a"} → ${plan.destination?.code ?? "n/a"}` : l.noPlan;
  // A API dá os minutos até ao destino
  const ete = data.destinationEte;
  const remaining =
    plan?.destination && ete !== undefined && ete > 0
      ? `${Math.floor(ete / 60)}h ${String(Math.floor(ete % 60)).padStart(2, "0")}m`
      : "n/a";
  const heading = data.headingTrue === undefined ? undefined : ((data.headingTrue * 180) / Math.PI + 360) % 360;
  const rows: [string, string][] = [
    [l.aircraft, [data.aircraft, data.livery].filter(Boolean).join(" · ") || "n/a"],
    [l.route, route],
    [l.remaining, remaining],
    [l.distance, plan?.destination && data.destinationDist ? `${n(data.destinationDist)} nm` : "n/a"],
    [l.position, data.latitude === undefined ? "n/a" : `${n(data.latitude, 4)}, ${n(data.longitude, 4)}`],
    [l.altitude, `${n(data.altitudeMsl)} ft`],
    [l.groundSpeed, `${n(data.groundSpeed === undefined ? undefined : data.groundSpeed * KNOTS)} kts`],
    [l.heading, `${n(heading)}°`],
    [l.verticalSpeed, `${n(data.verticalSpeed === undefined ? undefined : data.verticalSpeed * FPM)} fpm`],
    [l.onGround, data.onGround === undefined ? "n/a" : data.onGround ? l.yes : l.no],
    [l.server, data.server || "n/a"],
  ];
  return (
    <dl className="feeder-live">
      {rows.map(([label, value]) => (
        <div key={label} className="feeder-live__row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
