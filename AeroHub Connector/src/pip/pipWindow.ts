import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

// Mini janela (Picture-in-Picture) com o status do Discord:
// sempre por cima de tudo, no canto superior direito do ecrã, sem aparecer na barra de tarefas.
//
// Para aparecer na hora, é criada escondida assim que o app entra no Início, já com tudo
// carregado. Quem a mostra e esconde é a parte em Rust (src-tauri/src/pip.rs), que ouve os
// avisos do Windows (minimizar, tapar) e toca o som logo depois de ela aparecer.

export const PIP_LABEL = "pip";
export const PIP_SIZE = { width: 320, height: 84 };

const isTauri = "__TAURI_INTERNALS__" in window;

// Criar e fechar a mini janela, um de cada vez (evita criar duas ao mesmo tempo)
let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<unknown>) {
  queue = queue.then(task, task);
  return queue;
}

// Cria a mini janela escondida (ou recria, quando a língua muda)
export function preloadPip(params: Record<string, string>) {
  if (!isTauri) return;
  return enqueue(async () => {
    const existing = await WebviewWindow.getByLabel(PIP_LABEL);
    if (existing) await existing.destroy();
    const query = new URLSearchParams({ view: "pip", ...params });
    const pip = new WebviewWindow(PIP_LABEL, {
      url: `index.html?${query}`,
      title: "AeroHub Connector",
      ...PIP_SIZE,
      visible: false,
      decorations: false,
      transparent: true,
      shadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      maximizable: false,
      focus: false,
    });
    await new Promise<void>((resolve) => {
      void pip.once("tauri://created", () => resolve());
      void pip.once("tauri://error", () => resolve());
    });
  });
}

export function destroyPip() {
  if (!isTauri) return;
  return enqueue(async () => {
    const pip = await WebviewWindow.getByLabel(PIP_LABEL);
    await pip?.destroy();
  });
}

export type PipConfig = {
  // O app está no Início (há mini janela pronta)
  active: boolean;
  // Abrir sozinha ao minimizar / quando o app fica tapado
  autoMinimized: boolean;
  autoCovered: boolean;
  // Som ao aparecer
  sound: string;
};

// Uma de cada vez e pela ordem certa (ao entrar e sair do Início muito depressa)
let configQueue: Promise<unknown> = Promise.resolve();

export function configurePip(config: PipConfig) {
  if (!isTauri) return;
  const send = () => invoke("pip_configure", { config });
  configQueue = configQueue.then(send, send);
}

// Botão ⧉: minimiza o app e a mini janela aparece logo que ele começa a encolher
export function showPipAndMinimize() {
  if (isTauri) void invoke("pip_show_and_minimize");
}

// Clique na mini janela: traz o app de volta
export function openAppFromPip() {
  if (isTauri) void invoke("pip_open_app");
}

// ✕ da mini janela
export function dismissPip() {
  if (isTauri) void invoke("pip_dismiss");
}
