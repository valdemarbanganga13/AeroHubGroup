import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

// Ligação ao Discord a partir do app.
const isTauri = "__TAURI_INTERNALS__" in window;

// Abre o app do Discord através do link "discord://", que o Discord regista no Windows
// quando é instalado. Se o Discord já estiver aberto, passa para a frente.
export async function openDiscord() {
  if (!isTauri) return;
  await openUrl("discord://");
}

// Status enviado para o Discord (Rich Presence). Os textos já vêm na língua do app.
export type DiscordPresence = {
  details: string;
  detailsUrl?: string;
  state: string;
  startedAt: number; // ms — descolagem
  endsAt?: number; // ms — chegada prevista (o Discord mostra o tempo restante)
  largeText: string;
  largeUrl?: string;
  smallImage?: string; // endereço na internet (ex.: logo da companhia)
  smallText?: string;
  buttons: { label: string; url: string }[]; // até 2
};

// Os pedidos ao Discord vão em fila, pela ordem em que são feitos
// (assim um "limpar" nunca passa à frente de um "mostrar" que veio depois).
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

// Mostra/atualiza o status. Dá erro se o Discord não estiver aberto (tenta-se de novo mais tarde).
export function setDiscordPresence(presence: DiscordPresence) {
  if (!isTauri) return Promise.resolve();
  return enqueue(() => invoke("discord_set_presence", { presence }));
}

export function clearDiscordPresence() {
  if (!isTauri) return Promise.resolve();
  return enqueue(() => invoke("discord_clear_presence"));
}
