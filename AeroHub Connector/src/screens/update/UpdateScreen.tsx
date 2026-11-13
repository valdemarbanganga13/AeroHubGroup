import { useEffect, useRef, useState } from "react";
import { version as currentVersion } from "../../../package.json";
import WindowControls from "../../components/WindowControls";
import TransferProgress from "../../components/TransferProgress";
import LogoIcon, { LOGO_ICON_VIEWBOX } from "../../components/brand/LogoIcon";
import { CORNER_ICON, WINDOW_SIZE } from "../../components/brand/introLayout";
import { flyIcon, type IconBox } from "../../components/brand/flyIcon";
import { useI18n } from "../../i18n/I18nProvider";
import type { Translations } from "../../i18n/translations";
import { formatBytes, type TransferProgress as Progress } from "../../lib/simulatedTransfer";
import {
  checkForUpdate,
  installUpdate,
  installerName,
  installerSize,
  releaseNotes,
  type DownloadProgress,
  type Update,
} from "../../lib/updater";
import "./update.css";

// Atualização do app (aberta nas Definições → "Check for updates"):
// 1. A procurar: o ícone desenha-se no centro e fica a processar enquanto pergunta ao servidor
// 2. Encontrada: o ícone sobe para o canto; versão nova, tamanho e novidades (Back / Update)
//    (ou "Está tudo em dia" / "Não foi possível procurar", com o ícone ao centro)
// 3. A atualizar: engrenagens a rodar + barra com o download real; depois instala
//    (no Windows o app fecha e volta a abrir sozinho na versão nova)
// 4. Concluída: aparece quando o app volta a abrir depois de atualizar; o ícone desenha-se
//    e "Open AeroHub Connector" entra no app com a animação do ícone

type Step = "checking" | "available" | "latest" | "error" | "updating" | "done";
type TaskKey = keyof Translations["update"]["tasks"];

const iconHeight = (width: number) => (width * LOGO_ICON_VIEWBOX.height) / LOGO_ICON_VIEWBOX.width;

// Ícone grande no centro (a procurar)
const CENTER_ICON: IconBox = {
  left: (WINDOW_SIZE - 170) / 2,
  top: (WINDOW_SIZE - iconHeight(170)) / 2 - 10,
  width: 170,
};

// Ícone no centro da página final (e de "tudo em dia" / erro)
const DONE_ICON: IconBox = { left: (WINDOW_SIZE - 170) / 2, top: 130, width: 170 };

// O desenho de entrada do logo demora ~2,6 s; depois fica a processar
const ENTRANCE_MS = 2600;
// Tempo mínimo a processar, para não "piscar" quando o servidor responde logo
const MIN_PROCESSING_MS = 900;
const SETTLE_FALLBACK_MS = 3000;
const DONE_READY_MS = 3600;
// A barra só se atualiza de tantos em tantos milissegundos (o download avisa muitas vezes)
const PROGRESS_THROTTLE_MS = 100;

const EMPTY_PROGRESS: Progress<TaskKey> = {
  phase: "preparing",
  bytes: 0,
  totalBytes: 0,
  speed: 0,
  file: "",
  task: null,
  percent: 0,
  remainingSeconds: 0,
};

type UpdateScreenProps = {
  // Back: volta ao app sem atualizar
  onBack: () => void;
  // "Open AeroHub Connector" no fim: reabre o app (com a animação do ícone)
  onOpenApp: () => void;
  // O app acabou de ser atualizado para esta versão: abre logo em "Concluída"
  justUpdatedTo?: string | null;
};

export default function UpdateScreen({ onBack, onOpenApp, justUpdatedTo }: UpdateScreenProps) {
  const { t, language } = useI18n();
  const [step, setStep] = useState<Step>(justUpdatedTo ? "done" : "checking");
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<Progress<TaskKey>>(EMPTY_PROGRESS);
  const [doneReady, setDoneReady] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const iconAnimation = useRef<Animation | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    // 4. Acabou de atualizar: o ícone desenha-se ao centro e aparece "Open AeroHub Connector"
    if (justUpdatedTo) {
      later(() => setDoneReady(true), DONE_READY_MS);
      return;
    }
    // 1. A procurar: depois do desenho de entrada, o logo fica a processar até o servidor responder
    later(() => iconRef.current?.classList.add("is-processing"), ENTRANCE_MS);
    runCheck(ENTRANCE_MS + MIN_PROCESSING_MS);
  }, []);

  function runCheck(minWaitMs: number) {
    const startedAt = performance.now();
    checkForUpdate().then(
      (result) => afterCheck(startedAt, minWaitMs, result ? "available" : "latest", result),
      () => afterCheck(startedAt, minWaitMs, "error", null),
    );
  }

  function afterCheck(startedAt: number, minWaitMs: number, next: Step, result: Update | null) {
    const wait = Math.max(0, minWaitMs - (performance.now() - startedAt));
    later(() => {
      setUpdate(result);
      settleIcon(() => {
        // Encontrada: o ícone sobe para o canto. Senão fica ao centro, por cima da mensagem.
        iconAnimation.current = flyIcon(
          iconRef.current!,
          next === "available" ? CORNER_ICON : DONE_ICON,
          iconAnimation.current,
        );
        setStep(next);
      });
    }, wait);
  }

  // Espera o fim do ciclo do logo (quando já tem cor) para parar sem saltos
  function settleIcon(then: () => void) {
    const icon = iconRef.current;
    const fill = icon?.querySelector(".logo-icon__fill");
    if (!icon || !fill) return;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      icon.classList.remove("is-processing");
      icon.classList.add("is-settled");
      then();
    };
    fill.addEventListener("animationiteration", settle, { once: true });
    later(settle, SETTLE_FALLBACK_MS);
  }

  // Erro → "Tentar de novo": o ícone volta ao centro e processa outra vez
  function retry() {
    const icon = iconRef.current;
    if (!icon) return;
    icon.classList.remove("is-settled");
    icon.classList.add("is-processing");
    iconAnimation.current = flyIcon(icon, CENTER_ICON, iconAnimation.current);
    setStep("checking");
    runCheck(MIN_PROCESSING_MS * 2);
  }

  // 3. A atualizar: download real com velocidade e tempo restante; depois instala
  async function startUpdate() {
    if (!update) return;
    setStep("updating");
    setProgress(EMPTY_PROGRESS);

    const file = installerName(update);
    const knownSize = installerSize(update);
    const startedAt = performance.now();
    let lastShown = 0;
    let speed = 0;

    const onProgress = ({ downloaded, total: reported }: DownloadProgress) => {
      const total = reported ?? knownSize;
      const now = performance.now();
      if (now - lastShown < PROGRESS_THROTTLE_MS && downloaded !== total) return;
      lastShown = now;
      const elapsed = Math.max(0.001, (now - startedAt) / 1000);
      speed = downloaded / elapsed;
      setProgress({
        phase: "copying",
        bytes: downloaded,
        totalBytes: total ?? downloaded,
        speed,
        file,
        task: null,
        // O download ocupa quase toda a barra; o resto é a instalação
        percent: total ? (downloaded / total) * 95 : 0,
        remainingSeconds: total && speed > 0 ? (total - downloaded) / speed : 0,
      });
    };

    const onDownloaded = () =>
      setProgress((current) => ({
        ...current,
        phase: "finishing",
        task: "apply",
        // Download completo: mostra o tamanho todo
        bytes: knownSize ?? current.totalBytes,
        totalBytes: knownSize ?? current.totalBytes,
        percent: 97,
        remainingSeconds: 3,
      }));

    try {
      await installUpdate(update, onProgress, onDownloaded);
    } catch {
      iconAnimation.current = flyIcon(iconRef.current!, DONE_ICON, iconAnimation.current);
      setStep("error");
    }
  }

  const notes = update ? releaseNotes(update) : [];
  const releasedAt = formatDate(update?.date, language);
  const size = update ? installerSize(update) : null;

  return (
    <main className={`card update is-${step}`} data-tauri-drag-region>
      <WindowControls />

      <div
        ref={iconRef}
        className="intro-icon update-icon"
        style={{
          animation: "none",
          ...(justUpdatedTo ? DONE_ICON : CENTER_ICON),
          aspectRatio: `${LOGO_ICON_VIEWBOX.width} / ${LOGO_ICON_VIEWBOX.height}`,
        }}
      >
        <LogoIcon />
      </div>

      <p className="update-checking" aria-live="polite">
        {t.update.checking}
        <span className="welcome-processing__dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>

      {step === "available" && update && (
        <div className="update-step">
          <header className="step-header">
            <h1 className="step-header__title">{t.update.availableTitle}</h1>
            <p className="step-header__subtitle">{t.update.availableSubtitle(update.version)}</p>
          </header>

          <div className="update-info">
            <div className="update-info__versions">
              <span className="update-info__version">v{currentVersion}</span>
              <ArrowIcon />
              <span className="update-info__version is-new">v{update.version}</span>
            </div>
            {(size || releasedAt) && (
              <div className="update-info__size">
                <span>{size ? t.update.size : t.update.released}</span>
                <strong>{size ? formatBytes(size) : releasedAt}</strong>
              </div>
            )}
          </div>

          <section className="update-notes">
            <h2 className="update-notes__title">{t.update.whatsNew}</h2>
            <ul className="terms-points">
              {(notes.length > 0 ? notes : [t.update.notesFallback]).map((note) => (
                <li key={note} className="terms-points__item">
                  <span className="terms-points__dot" aria-hidden="true" />
                  <p>{note}</p>
                </li>
              ))}
            </ul>
          </section>

          <button className="btn btn-ghost update-action update-action--left" type="button" onClick={onBack}>
            {t.buttons.back}
          </button>
          <button className="btn btn-primary update-action update-action--right" type="button" onClick={startUpdate}>
            {t.update.updateButton}
          </button>
        </div>
      )}

      {(step === "latest" || step === "error") && (
        <div className="update-step">
          <section className="update-done update-done--quick" aria-live="polite">
            <h1 className="update-done__title">{step === "latest" ? t.update.latestTitle : t.update.errorTitle}</h1>
            <p className="update-done__text">
              {step === "latest" ? t.update.latestText(currentVersion) : t.update.errorText}
            </p>
          </section>

          <button className="btn btn-ghost update-action update-action--left" type="button" onClick={onBack}>
            {t.buttons.back}
          </button>
          {step === "error" && (
            <button className="btn btn-primary update-action update-action--right" type="button" onClick={retry}>
              {t.update.retry}
            </button>
          )}
        </div>
      )}

      {step === "updating" && (
        <div className="update-step">
          <header className="step-header">
            <h1 className="step-header__title">{t.update.updatingTitle}</h1>
            <p className="step-header__subtitle">{t.update.updatingSubtitle}</p>
          </header>

          <GearsAnimation paused={progress.phase === "complete"} />

          <TransferProgress progress={progress} label={formatLabel(progress, t)} />
        </div>
      )}

      {step === "done" && (
        <div className="update-step">
          <section className="update-done">
            <h1 className="update-done__title">{t.update.doneTitle}</h1>
            <p className="update-done__text">{t.update.doneText(justUpdatedTo ?? currentVersion)}</p>
          </section>

          <button
            className={`btn btn-primary update-action update-action--right update-open ${doneReady ? "" : "is-hidden"}`}
            type="button"
            disabled={!doneReady}
            onClick={onOpenApp}
          >
            {t.update.openApp}
          </button>
        </div>
      )}
    </main>
  );
}

function formatLabel(progress: Progress<TaskKey>, t: Translations) {
  if (progress.phase === "preparing") return t.installing.preparing;
  if (progress.phase === "copying") return `${t.update.downloading}  ${progress.file}`;
  if (progress.phase === "finishing" && progress.task) return t.update.tasks[progress.task];
  return t.update.doneTitle;
}

function formatDate(date: string | undefined, language: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(parsed);
}

function ArrowIcon() {
  return (
    <svg className="update-info__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- Engrenagens a rodar (a atualizar) ----------

// Desenha uma roda dentada com furo ao centro
function gearPath(cx: number, cy: number, teeth: number, outer: number, root: number, hole: number) {
  const step = (Math.PI * 2) / teeth;
  const point = (radius: number, angle: number) =>
    `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  let path = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    path += `${i === 0 ? "M" : "L"}${point(root, a)} `;
    path += `L${point(outer, a + step * 0.18)} L${point(outer, a + step * 0.42)} L${point(root, a + step * 0.6)} `;
  }
  path += "Z ";
  path += `M${cx + hole} ${cy} A${hole} ${hole} 0 1 0 ${cx - hole} ${cy} A${hole} ${hole} 0 1 0 ${cx + hole} ${cy} Z`;
  return path;
}

const BIG_GEAR = gearPath(62, 62, 12, 46, 37, 13);
const SMALL_GEAR = gearPath(116, 108, 9, 29, 22, 8);

function GearsAnimation({ paused }: { paused: boolean }) {
  return (
    <div className={`gears-animation ${paused ? "is-paused" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 150 140" fill="none">
        <defs>
          <linearGradient id="gear-green" x1="62" y1="16" x2="62" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7cc23a" />
            <stop offset="1" stopColor="#4f8c10" />
          </linearGradient>
          <linearGradient id="gear-blue" x1="116" y1="79" x2="116" y2="137" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5EA0EF" />
            <stop offset="1" stopColor="#008BFD" />
          </linearGradient>
        </defs>
        <path className="gears-animation__big" d={BIG_GEAR} fill="url(#gear-green)" fillRule="evenodd" />
        <path className="gears-animation__small" d={SMALL_GEAR} fill="url(#gear-blue)" fillRule="evenodd" />
      </svg>
    </div>
  );
}
