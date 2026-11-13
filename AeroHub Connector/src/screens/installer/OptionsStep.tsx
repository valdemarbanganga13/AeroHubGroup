import { open } from "@tauri-apps/plugin-dialog";
import LanguageSelect from "../../components/LanguageSelect";
import Toggle from "../../components/Toggle";
import { useI18n } from "../../i18n/I18nProvider";

// Passo 3 — Opções de instalação: língua, pasta, atalho no ambiente de trabalho e iniciar com o Windows.
// A língua muda logo todos os textos (esta página e as seguintes) e é a língua com que o app abre.
// (Sem "fixar na barra de tarefas": o Windows não deixa os programas fixarem-se sozinhos.)

export const APP_FOLDER_NAME = "AeroHub Connector";

export type InstallOptions = {
  installPath: string;
  desktopShortcut: boolean;
  startWithWindows: boolean;
};

type OptionsStepProps = {
  options: InstallOptions;
  onChange: (options: InstallOptions) => void;
};

const isTauri = "__TAURI_INTERNALS__" in window;

export default function OptionsStep({ options, onChange }: OptionsStepProps) {
  const { t, language, setLanguage } = useI18n();
  const update = (patch: Partial<InstallOptions>) => onChange({ ...options, ...patch });

  async function chooseFolder() {
    if (!isTauri) return;
    const folder = await open({
      directory: true,
      title: t.options.chooseFolder,
      defaultPath: options.installPath,
    });
    if (typeof folder !== "string") return;
    // Como os instaladores normais: a pasta do app fica dentro da pasta escolhida
    const installPath = folder.endsWith(APP_FOLDER_NAME)
      ? folder
      : `${folder.replace(/[\\/]+$/, "")}\\${APP_FOLDER_NAME}`;
    update({ installPath });
  }

  return (
    <>
      <header className="step-header">
        <h1 className="step-header__title">{t.options.title}</h1>
        <p className="step-header__subtitle">{t.options.subtitle}</p>
      </header>

      <section className="options-language">
        <p className="options-label">{t.options.language}</p>
        <LanguageSelect value={language} onChange={setLanguage} />
      </section>

      <section className="options-location">
        <p className="options-label">{t.options.installLocation}</p>
        <div className="options-location__row">
          <div className="options-location__path" title={options.installPath}>
            <FolderIcon />
            <span>{options.installPath}</span>
          </div>
          <button className="btn btn-ghost options-location__change" type="button" onClick={chooseFolder}>
            {t.options.change}
          </button>
        </div>
      </section>

      <section className="options-list">
        <label className="options-item">
          <span className="options-item__text">
            <span className="options-item__title">{t.options.desktopShortcut.title}</span>
            <span className="options-item__description">{t.options.desktopShortcut.description}</span>
          </span>
          <Toggle checked={options.desktopShortcut} onChange={(desktopShortcut) => update({ desktopShortcut })} />
        </label>

        <label className="options-item">
          <span className="options-item__text">
            <span className="options-item__title">{t.options.startWithWindows.title}</span>
            <span className="options-item__description">{t.options.startWithWindows.description}</span>
          </span>
          <Toggle checked={options.startWithWindows} onChange={(startWithWindows) => update({ startWithWindows })} />
        </label>
      </section>
    </>
  );
}

function FolderIcon() {
  return (
    <svg className="options-location__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.5 1.5H13c.69 0 1.25.56 1.25 1.25v6.25c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25V4.25z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
