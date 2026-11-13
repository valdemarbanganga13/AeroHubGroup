import { useI18n } from "../i18n/I18nProvider";
import { formatBytes, type TransferProgress as Progress } from "../lib/simulatedTransfer";

// Linha do ficheiro/tarefa atual + barra de progresso com tamanho, tempo restante e velocidade.
// Usado na instalação e na atualização (as classes de estilo estão em installer.css).

type TransferProgressProps = {
  progress: Progress<string>;
  // Texto da linha de cima (ficheiro a copiar ou tarefa atual)
  label: string;
};

export default function TransferProgress({ progress, label }: TransferProgressProps) {
  const { t } = useI18n();
  const complete = progress.phase === "complete";

  let remaining = t.installing.done;
  if (progress.phase === "preparing") remaining = t.installing.calculating;
  else if (!complete) {
    const seconds = Math.ceil(progress.remainingSeconds);
    remaining =
      seconds >= 60
        ? t.installing.minutesLeft(Math.ceil(seconds / 60))
        : t.installing.secondsLeft(Math.max(1, Math.ceil(seconds / 5) * 5));
  }

  return (
    <>
      <p className="installing-file" key={label}>
        {label}
      </p>

      <section className="installing-progress">
        <div className="installing-progress__row">
          <span className="installing-progress__percent">{Math.floor(progress.percent)}%</span>
          <span>{t.installing.sizeOf(formatBytes(progress.bytes), formatBytes(progress.totalBytes))}</span>
        </div>

        <div className={`progress-bar ${complete ? "is-complete" : ""}`}>
          <div className="progress-bar__fill" style={{ width: `${progress.percent}%` }} />
        </div>

        <div className="installing-progress__row installing-progress__row--muted">
          <span>{remaining}</span>
          <span>{progress.phase === "copying" ? `${formatBytes(progress.speed)}/s` : ""}</span>
        </div>
      </section>
    </>
  );
}
