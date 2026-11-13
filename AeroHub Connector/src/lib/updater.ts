import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

// Atualizações reais do app.
// - O app pergunta a connector.aerohubradar.com/updates/latest.json qual é a versão mais recente
//   (o site reencaminha para a última versão publicada no GitHub).
// - Descarrega o instalador, confirma a assinatura (chave pública em tauri.conf.json) e instala.
//   No Windows o app fecha durante a instalação e volta a abrir já na versão nova,
//   mostrando o ecrã "Atualização concluída". No Mac a app é substituída e reaberta da mesma forma.
//   O plugin escolhe sozinho a entrada certa do latest.json (windows-x86_64 ou darwin-…).
// Publicar uma versão nova: npm run release 0.2.0 (ver scripts/release.mjs).

export type { Update };

const isTauri = "__TAURI_INTERNALS__" in window;
const JUST_UPDATED_KEY = "aerohub-connector.just-updated";
const CHECK_TIMEOUT_MS = 15000;

// null = já está na versão mais recente
export async function checkForUpdate(): Promise<Update | null> {
  if (!isTauri) return null;
  return check({ timeout: CHECK_TIMEOUT_MS });
}

export type DownloadProgress = {
  downloaded: number;
  // Tamanho total (se o servidor o disser)
  total: number | null;
};

// Uma atualização de cada vez (botão e verificação automática ao mesmo tempo, por exemplo)
let installing = false;

export async function installUpdate(
  update: Update,
  onProgress: (progress: DownloadProgress) => void = () => {},
  onDownloaded: () => void = () => {},
) {
  if (installing) return;
  installing = true;
  try {
    let downloaded = 0;
    let total: number | null = null;
    await update.download((event) => {
      if (event.event === "Started") total = event.data.contentLength ?? null;
      if (event.event === "Progress") downloaded += event.data.chunkLength;
      onProgress({ downloaded, total });
    });
    onDownloaded();
    // Para o app mostrar "Atualização concluída" quando voltar a abrir
    try {
      window.localStorage.setItem(JUST_UPDATED_KEY, update.version);
    } catch {
      // Sem armazenamento: abre direto no Início
    }
    await update.install();
    await relaunch();
  } finally {
    installing = false;
  }
}

// Ao abrir: o app acabou de ser atualizado? (devolve a versão nova, só uma vez)
export function consumeJustUpdated(currentVersion: string): string | null {
  try {
    const version = window.localStorage.getItem(JUST_UPDATED_KEY);
    window.localStorage.removeItem(JUST_UPDATED_KEY);
    return version === currentVersion ? version : null;
  } catch {
    return null;
  }
}

// A entrada do latest.json para este computador (Windows ou Mac; a versão Mac é universal)
const isMac = /Mac/i.test(navigator.userAgent);

function platformEntry(update: Update) {
  const platforms = (update.rawJson as { platforms?: Record<string, { url?: string; size?: number }> }).platforms;
  if (!platforms) return undefined;
  if (isMac) return platforms["darwin-aarch64"] ?? platforms["darwin-x86_64"] ?? platforms["darwin-universal"];
  return platforms["windows-x86_64"];
}

// Nome do instalador (para a linha "A descarregar …")
export function installerName(update: Update) {
  const url = platformEntry(update)?.url;
  const name = url ? decodeURIComponent(url.split("/").pop() ?? "") : "";
  return name || `AeroHub Connector ${update.version}`;
}

// Tamanho do instalador em bytes (gravado no latest.json na publicação; ver release.yml)
export function installerSize(update: Update): number | null {
  const size = platformEntry(update)?.size;
  return typeof size === "number" && size > 0 ? size : null;
}

// Novidades da versão (o texto da Release no GitHub, uma por linha)
export function releaseNotes(update: Update) {
  return (update.body ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}
