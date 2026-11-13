import { useEffect, useRef, useState } from "react";
import type { Language } from "../../i18n/languages";
import type { TransferProgress } from "../../lib/simulatedTransfer";
import type { InstallBackend, InstallEvent, InstallTask } from "./installBackend";
import type { InstallOptions } from "./OptionsStep";

// Progresso da instalação real (setup.exe), no mesmo formato da demonstração.
// A barra segue os bytes que já estão na pasta de instalação, mas nunca anda mais depressa
// do que MIN_COPY_MS no total — instalar demora 1–2 s e assim a animação ainda se vê.
// Depois mostra cada tarefa final (atalho, iniciar com o Windows, …) pela ordem em que acontece.

const TICK_MS = 100;
const MIN_COPY_MS = 3200;
const MIN_TASK_MS = 450;
const COPY_SHARE = 0.92;

// Nomes mostrados na linha "A copiar …" (os ficheiros que ficam na pasta do app)
const FILES = ["aerohub-connector.exe", "uninstall.exe"];

type Result = { progress: TransferProgress<InstallTask>; error: string | null };

const INITIAL: TransferProgress<InstallTask> = {
  phase: "preparing",
  bytes: 0,
  totalBytes: 0,
  speed: 0,
  file: "",
  task: null,
  percent: 0,
  remainingSeconds: 0,
};

export function useRealInstall(
  active: boolean,
  options: InstallOptions,
  language: Language,
  backend: InstallBackend,
  onComplete: () => void,
): Result {
  const [progress, setProgress] = useState(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    // O que a parte em Rust já fez (alvo) e o que a barra já mostra
    let targetBytes = 0;
    let total = 0;
    let shownBytes = 0;
    const tasks: InstallTask[] = [];
    let shownTasks = 0;
    let taskShownAt = 0;
    let done = false;
    let finished = false;
    let stop: (() => void) | undefined;

    const onEvent = (event: InstallEvent) => {
      if (event.phase === "copying") {
        targetBytes = event.bytes;
        total = event.total;
      } else if (event.phase === "task") tasks.push(event.task);
      else if (event.phase === "done") done = true;
      else if (event.phase === "error") setError(event.message);
    };

    void backend.install(options, language, onEvent).then(
      (unlisten) => (stop = unlisten),
      (reason) => setError(String(reason)),
    );

    const timer = window.setInterval(() => {
      if (finished || total === 0) return;
      const now = performance.now();

      // 1. A copiar
      if (shownBytes < total) {
        const step = (total * TICK_MS) / MIN_COPY_MS;
        const next = Math.min(targetBytes, shownBytes + step);
        const speed = ((next - shownBytes) * 1000) / TICK_MS;
        shownBytes = next;
        if (shownBytes >= total) taskShownAt = now - MIN_TASK_MS;
        setProgress({
          phase: "copying",
          bytes: shownBytes,
          totalBytes: total,
          speed,
          file: FILES[Math.min(FILES.length - 1, Math.floor((shownBytes / total) * FILES.length))],
          task: null,
          percent: (shownBytes / total) * COPY_SHARE * 100,
          remainingSeconds: speed > 0 ? (total - shownBytes) / speed : MIN_COPY_MS / 1000,
        });
        return;
      }

      // 2. Tarefas finais, uma de cada vez
      if (shownTasks < tasks.length && now - taskShownAt >= MIN_TASK_MS) {
        const task = tasks[shownTasks];
        shownTasks += 1;
        taskShownAt = now;
        setProgress((current) => ({
          ...current,
          phase: "finishing",
          file: "",
          task,
          percent: (COPY_SHARE + (1 - COPY_SHARE) * (shownTasks / (tasks.length + 1))) * 100,
          remainingSeconds: 1,
        }));
        return;
      }

      // 3. Concluída
      if (done && shownTasks === tasks.length && now - taskShownAt >= MIN_TASK_MS) {
        finished = true;
        window.clearInterval(timer);
        setProgress((current) => ({ ...current, phase: "complete", task: null, percent: 100, remainingSeconds: 0 }));
        onCompleteRef.current();
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
      stop?.();
    };
    // A instalação começa uma vez, quando o passo fica ativo
  }, [active]);

  return { progress, error };
}
