import { invoke } from "@tauri-apps/api/core";
import { LANGUAGES, type Language } from "../i18n/languages";
import { saveSettings } from "./settings";

// Primeira abertura depois de instalar com o AeroHub Connector Setup:
// aplica as escolhas feitas no instalador (língua e iniciar com o Windows).
// Devolve true quando é a primeira abertura (o app começa nas Boas-vindas).

const isTauri = "__TAURI_INTERNALS__" in window;
const LANGUAGE_KEY = "aerohub-connector.language";

type InstallerPrefs = { language?: string; startWithWindows?: boolean };

export async function applyInstallerPrefs(): Promise<boolean> {
  if (!isTauri) return false;
  const prefs = await invoke<InstallerPrefs | null>("take_installer_prefs").catch(() => null);
  if (!prefs) return false;

  const language = LANGUAGES.find((item) => item.code === prefs.language)?.code as Language | undefined;
  try {
    if (language) window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Sem armazenamento: usa a língua do Windows
  }
  if (typeof prefs.startWithWindows === "boolean") saveSettings({ startWithWindows: prefs.startWithWindows });
  return true;
}

// Definições → "Iniciar com o Windows" (só funciona no app instalado)
export function applyStartWithWindows(enabled: boolean) {
  if (isTauri) void invoke("set_start_with_windows", { enabled }).catch(() => {});
}
