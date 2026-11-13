import { useEffect } from "react";
import TransferProgress from "../../components/TransferProgress";
import { useI18n } from "../../i18n/I18nProvider";
import type { Translations } from "../../i18n/translations";
import { useSimulatedTransfer, type TransferProgress as Progress } from "../../lib/simulatedTransfer";
import type { Language } from "../../i18n/languages";
import type { InstallBackend } from "./installBackend";
import type { InstallOptions } from "./OptionsStep";
import { useRealInstall } from "./useRealInstall";

// Passo 4 — A instalar: animação de ficheiros a entrar na pasta, ficheiro atual,
// barra de progresso, tamanho copiado (MB/GB), velocidade e tempo estimado.
// No AeroHub Connector Setup (setup.exe) a instalação é real (useRealInstall);
// no app em `npm run tauri dev` é só a demonstração (useSimulatedTransfer).

const TOTAL_BYTES = 64.8 * 1024 * 1024; // tamanho simulado do app

const FILES = [
  "AeroHub Connector.exe",
  "resources/app.dat",
  "resources/locales/en.json",
  "resources/locales/pt.json",
  "resources/icons/app-icon.ico",
  "resources/icons/tray-icon.png",
  "lib/discord-rpc.dll",
  "lib/webview2-loader.dll",
  "lib/infinite-flight-connect.dll",
  "assets/fonts/inter-variable.woff2",
  "assets/logos/logo-icon.svg",
  "assets/logos/logo-wordmark.svg",
  "config/defaults.json",
  "uninstall.exe",
];

type TaskKey = keyof Translations["installing"]["tasks"];

function finishingTasks(options: InstallOptions) {
  const tasks: TaskKey[] = [];
  if (options.desktopShortcut) tasks.push("desktopShortcut");
  if (options.startWithWindows) tasks.push("startWithWindows");
  tasks.push("registering", "finishing");
  return tasks;
}

function formatLabel(progress: Progress<TaskKey>, t: Translations) {
  if (progress.phase === "preparing") return t.installing.preparing;
  if (progress.phase === "copying") return `${t.installing.copying}  ${progress.file}`;
  if (progress.phase === "finishing" && progress.task) return t.installing.tasks[progress.task];
  return t.installing.complete;
}

type InstallingStepProps = {
  active: boolean;
  options: InstallOptions;
  language: Language;
  // Instalação real (setup.exe); sem ela, é a demonstração
  backend?: InstallBackend;
  onComplete: () => void;
  onError: () => void;
};

export default function InstallingStep({ active, options, language, backend, onComplete, onError }: InstallingStepProps) {
  const { t } = useI18n();
  const simulated = useSimulatedTransfer({
    active: active && !backend,
    totalBytes: TOTAL_BYTES,
    files: FILES,
    tasks: finishingTasks(options),
    onComplete,
  });
  const real = useRealInstall(active && !!backend, options, language, backend!, onComplete);
  const progress = backend ? real.progress : simulated;
  const failed = backend ? real.error !== null : false;
  const complete = progress.phase === "complete";

  useEffect(() => {
    if (failed) onError();
  }, [failed]);

  if (failed) {
    return (
      <header className="step-header">
        <h1 className="step-header__title">{t.installing.errorTitle}</h1>
        <p className="step-header__subtitle">{t.installing.errorSubtitle}</p>
      </header>
    );
  }

  return (
    <>
      <header className="step-header">
        <h1 className="step-header__title">
          {complete ? t.installing.completeTitle : t.installing.title}
        </h1>
        <p className="step-header__subtitle">
          {complete ? t.installing.completeSubtitle : t.installing.subtitle}
        </p>
      </header>

      <FilesAnimation paused={complete} />

      <TransferProgress progress={progress} label={formatLabel(progress, t)} />
    </>
  );
}

// Pasta com ficheiros a cair lá para dentro, em ciclo
function FilesAnimation({ paused }: { paused: boolean }) {
  return (
    <div className={`files-animation ${paused ? "is-paused" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 160 140" fill="none">
        <defs>
          <linearGradient id="folder-front" x1="80" y1="64" x2="80" y2="132" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6cb51c" />
            <stop offset="1" stopColor="#4f8c10" />
          </linearGradient>
          <linearGradient id="file-line" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#008bfd" />
            <stop offset="1" stopColor="#5ea0ef" />
          </linearGradient>
        </defs>

        {/* Fundo da pasta */}
        <path
          d="M30 38h30l9 9h61a6 6 0 0 1 6 6v73a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V44a6 6 0 0 1 6-6z"
          fill="#2f5a0c"
        />

        {/* Ficheiros */}
        {[0, 1, 2].map((index) => (
          <g key={index} className="files-animation__file" style={{ animationDelay: `${index * 0.6}s` }}>
            <rect x="63" y="14" width="34" height="42" rx="5" fill="#f4f8ff" />
            <rect x="69" y="23" width="16" height="3" rx="1.5" fill="url(#file-line)" />
            <rect x="69" y="30" width="22" height="3" rx="1.5" fill="#c9d8ea" />
            <rect x="69" y="37" width="19" height="3" rx="1.5" fill="#c9d8ea" />
          </g>
        ))}

        {/* Frente da pasta (por cima dos ficheiros, que "entram" nela) */}
        <path
          className="files-animation__front"
          d="M24 70a6 6 0 0 1 6-6h100a6 6 0 0 1 6 6v56a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V70z"
          fill="url(#folder-front)"
        />
      </svg>
    </div>
  );
}
