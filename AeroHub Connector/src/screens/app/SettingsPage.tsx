import { useEffect, useRef, useState } from "react";
import { version } from "../../../package.json";
import Checkbox from "../../components/Checkbox";
import LanguageSelect from "../../components/LanguageSelect";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import LicenseNotice from "../../components/LicenseNotice";
import { useAccount } from "../../lib/account";
import { useI18n } from "../../i18n/I18nProvider";
import { openDiscord } from "../../lib/discord";
import { applyStartWithWindows } from "../../lib/firstRun";
import { isMac } from "../../lib/platform";
import { useSettings } from "../../lib/settings";
import { PIN_SOUNDS, playPinSound, type PinSound } from "../../lib/sounds";

// Definições.
// - Geral: idioma (muda o app todo na hora) e iniciar com o Windows
// - Piloto automático: abrir o Discord sozinho quando começa um voo e ele está fechado,
//   e um botão para testar (abre mesmo o Discord agora)
// - Fixar estado no ecrã: abrir sozinho a mini janela do status ao minimizar o app
//   (e, se quiser, também quando o app fica tapado; e só durante um voo),
//   e o som que toca quando ela aparece (com botão para ouvir)
// - Atualizações: instalar sozinho e "Check for updates" (abre o ecrã de atualização) — já reais
// Iniciar com o Windows já é real no app instalado; o Discord automático ainda só guarda a escolha (Fase 2).

type TestState = "idle" | "opening" | "done";

type SettingsPageProps = {
  onCheckUpdates: () => void;
};

export default function SettingsPage({ onCheckUpdates }: SettingsPageProps) {
  const { t, language, setLanguage } = useI18n();
  const [settings, updateSettings] = useSettings();
  const { account } = useAccount();
  const [testState, setTestState] = useState<TestState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const playingTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
      window.clearTimeout(playingTimer.current);
    },
    [],
  );

  async function testDiscord() {
    setTestState("opening");
    try {
      await openDiscord();
    } finally {
      setTestState("done");
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setTestState("idle"), 2500);
    }
  }

  // Botão ▶: toca o som escolhido (pelo mesmo sistema que a mini janela usa)
  function listen(sound: PinSound) {
    if (sound === "off") return;
    playPinSound(sound);
    setPlaying(true);
    window.clearTimeout(playingTimer.current);
    playingTimer.current = window.setTimeout(() => setPlaying(false), 700);
  }

  // Ao escolher um som novo, ele toca logo uma vez
  function chooseSound(pinSound: PinSound) {
    updateSettings({ pinSound });
    listen(pinSound);
  }

  const s = t.app.settings;

  return (
    <div className="page settings">
      <header className="page-header" data-tauri-drag-region>
        <h1 className="page-header__title">{t.app.nav.settings}</h1>
        <p className="page-header__subtitle">{s.subtitle}</p>
      </header>

      {/* Só as secções deslizam; o título fica fixo, ao lado dos botões da janela */}
      <div className="settings-scroll">
        <section className="settings-section">
          <h2 className="settings-section__title">{s.general}</h2>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row__text">
                <p className="settings-row__title">{s.language}</p>
                <p className="settings-row__description">{s.languageDescription}</p>
              </div>
              <LanguageSelect value={language} onChange={setLanguage} />
            </div>

            <label className="settings-row settings-row--toggle">
              <div className="settings-row__text">
                {/* Windows: "Start with Windows"; Mac: "Open at login" (o mesmo interruptor) */}
                <p className="settings-row__title">{isMac ? s.startAtLogin : s.startWithWindows}</p>
                <p className="settings-row__description">
                  {isMac ? s.startAtLoginDescription : s.startWithWindowsDescription}
                </p>
              </div>
              <Toggle
                checked={settings.startWithWindows}
                onChange={(startWithWindows) => {
                  updateSettings({ startWithWindows });
                  applyStartWithWindows(startWithWindows);
                }}
              />
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{s.autopilot}</h2>
          <div className="settings-card">
            {/* O piloto automático abre o Discord: só com licença */}
            {!account?.hasLicense && <LicenseNotice />}
            <label className={`settings-row settings-row--toggle ${account?.hasLicense ? "" : "is-disabled"}`} inert={!account?.hasLicense}>
              <div className="settings-row__text">
                <p className="settings-row__title">{s.discordAutopilot}</p>
                <p className="settings-row__description">{s.discordAutopilotDescription}</p>
              </div>
              <Toggle
                checked={settings.discordAutopilot}
                onChange={(discordAutopilot) => updateSettings({ discordAutopilot })}
              />
            </label>

            <div className={`settings-row ${account?.hasLicense ? "" : "is-disabled"}`} inert={!account?.hasLicense}>
              <div className="settings-row__text">
                <p className="settings-row__title">{s.test}</p>
                <p className="settings-row__description">{s.testDescription}</p>
              </div>
              <button
                className={`btn btn-ghost settings-test is-${testState}`}
                type="button"
                disabled={testState === "opening"}
                onClick={testDiscord}
              >
                {testState === "opening" ? s.testOpening : testState === "done" ? s.testDone : s.testButton}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{s.pip}</h2>
          <div className="settings-card">
            <label className="settings-row settings-row--toggle">
              <div className="settings-row__text">
                <p className="settings-row__title">{s.autoPip}</p>
                <p className="settings-row__description">{s.autoPipDescription}</p>
              </div>
              <Toggle checked={settings.autoPip} onChange={(autoPip) => updateSettings({ autoPip })} />
            </label>

            {/* Opções extra: só contam com a principal ligada */}
            <div className={`settings-suboptions ${settings.autoPip ? "" : "is-disabled"}`}>
              {/* "Tapado por outras janelas" só se consegue detetar no Windows.
                  (A mini janela é o cartão do voo: só aparece durante um voo, por isso não há opção para isso.) */}
              {!isMac && (
                <Checkbox
                  checked={settings.autoPipWhenCovered}
                  onChange={(autoPipWhenCovered) => updateSettings({ autoPipWhenCovered })}
                >
                  {s.autoPipWhenCovered}
                </Checkbox>
              )}
            </div>

            {/* Vale também para o botão ⧉ do Início, por isso não depende do interruptor acima */}
            <div className="settings-row">
              <div className="settings-row__text">
                <p className="settings-row__title">{s.pinSound}</p>
                <p className="settings-row__description">{s.pinSoundDescription}</p>
              </div>
              <div className="settings-sound">
                <Select
                  className="settings-sound__select"
                  value={settings.pinSound}
                  options={PIN_SOUNDS.map((sound) => ({ value: sound, label: s.pinSounds[sound] }))}
                  onChange={chooseSound}
                />
                <button
                  className={`settings-sound__play has-tooltip ${playing ? "is-playing" : ""}`}
                  type="button"
                  aria-label={s.pinSoundListen}
                  disabled={settings.pinSound === "off"}
                  onClick={() => listen(settings.pinSound)}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M5 3.4v9.2a.6.6 0 0 0 .92.5l7.1-4.6a.6.6 0 0 0 0-1L5.92 2.9A.6.6 0 0 0 5 3.4z" />
                  </svg>
                  <span className="ui-tooltip ui-tooltip--above">{s.pinSoundListen}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{s.updates}</h2>
          <div className="settings-card">
            <label className="settings-row settings-row--toggle">
              <div className="settings-row__text">
                <p className="settings-row__title">{s.autoUpdate}</p>
                <p className="settings-row__description">{s.autoUpdateDescription}</p>
              </div>
              <Toggle checked={settings.autoUpdate} onChange={(autoUpdate) => updateSettings({ autoUpdate })} />
            </label>

            <div className="settings-row">
              <div className="settings-row__text">
                <p className="settings-row__title">{s.version}</p>
                <p className="settings-row__description">{s.versionDescription(version)}</p>
              </div>
              <button className="btn btn-primary settings-check" type="button" onClick={onCheckUpdates}>
                {s.checkUpdates}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
