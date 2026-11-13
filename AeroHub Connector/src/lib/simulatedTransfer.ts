import { useEffect, useRef, useState } from "react";

// Simulação de uma cópia/descarga com tarefas finais (instalação e atualização).
// Avança pelo tempo real que passou (e não por "tique"), para não abrandar quando
// a janela está minimizada e o Windows atrasa os temporizadores.
// SIMULADO nesta fase: a instalação/atualização real vem na fase do instalador.

const PREPARE_MS = 1200;
const TASK_MS = 650;
const TICK_MS = 100;
const COPY_SHARE = 0.92; // a cópia ocupa 92% da barra; as tarefas finais o resto

export type TransferPhase = "preparing" | "copying" | "finishing" | "complete";

// Guarda o que está a acontecer (e não o texto), para o texto sair na língua escolhida
export type TransferProgress<Task extends string> = {
  phase: TransferPhase;
  bytes: number;
  totalBytes: number;
  speed: number; // bytes por segundo
  file: string;
  task: Task | null;
  percent: number;
  remainingSeconds: number;
};

type Options<Task extends string> = {
  active: boolean;
  totalBytes: number;
  files: string[];
  tasks: Task[];
  onComplete: () => void;
};

export function formatBytes(bytes: number) {
  const gb = 1024 ** 3;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function useSimulatedTransfer<Task extends string>({
  active,
  totalBytes,
  files,
  tasks,
  onComplete,
}: Options<Task>) {
  const initial: TransferProgress<Task> = {
    phase: "preparing",
    bytes: 0,
    totalBytes,
    speed: 0,
    file: "",
    task: null,
    percent: 0,
    remainingSeconds: 0,
  };
  const [progress, setProgress] = useState<TransferProgress<Task>>(initial);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    const startedAt = performance.now();
    let bytes = 0;
    let speed = 0;
    let finishingStartedAt = 0;
    let lastTick = startedAt;

    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTick) / 1000;
      lastTick = now;

      if (now - startedAt < PREPARE_MS) {
        setProgress(initial);
        return;
      }

      if (bytes < totalBytes) {
        // Velocidade a variar um pouco, como numa cópia real (3,5 a 7 MB/s)
        const target = (3.5 + Math.random() * 3.5) * 1024 ** 2;
        speed = speed === 0 ? target : speed * 0.85 + target * 0.15;
        bytes = Math.min(totalBytes, bytes + speed * elapsed);
        const fileIndex = Math.min(files.length - 1, Math.floor((bytes / totalBytes) * files.length));
        setProgress({
          phase: "copying",
          bytes,
          totalBytes,
          speed,
          file: files[fileIndex],
          task: null,
          percent: (bytes / totalBytes) * COPY_SHARE * 100,
          remainingSeconds: (totalBytes - bytes) / speed + (tasks.length * TASK_MS) / 1000,
        });
        if (bytes >= totalBytes) finishingStartedAt = now;
        return;
      }

      const taskIndex = Math.floor((now - finishingStartedAt) / TASK_MS);
      if (taskIndex < tasks.length) {
        const taskProgress = (now - finishingStartedAt) / (tasks.length * TASK_MS);
        setProgress({
          phase: "finishing",
          bytes,
          totalBytes,
          speed,
          file: "",
          task: tasks[taskIndex],
          percent: (COPY_SHARE + (1 - COPY_SHARE) * taskProgress) * 100,
          remainingSeconds: (tasks.length * TASK_MS - (now - finishingStartedAt)) / 1000,
        });
        return;
      }

      window.clearInterval(timer);
      setProgress({
        phase: "complete",
        bytes,
        totalBytes,
        speed,
        file: "",
        task: null,
        percent: 100,
        remainingSeconds: 0,
      });
      onCompleteRef.current();
    }, TICK_MS);

    return () => window.clearInterval(timer);
    // A simulação corre uma vez, quando fica ativa
  }, [active]);

  return progress;
}
