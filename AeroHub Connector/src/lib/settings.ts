import { useState } from "react";
import type { PinSound } from "./sounds";

// Preferências do app. Nesta fase só ficam guardadas (neste computador);
// o comportamento real (arranque com o Windows, Discord automático) entra na Fase 2.

export type AppSettings = {
  // Abrir o app sozinho quando o Windows arranca
  startWithWindows: boolean;
  // Abrir o Discord automaticamente quando começa um voo e o Discord está fechado
  discordAutopilot: boolean;
  // Instalar as atualizações sozinho, assim que saírem
  autoUpdate: boolean;
  // Abrir sozinho a mini janela do status (Picture-in-Picture) quando o app é minimizado
  autoPip: boolean;
  // …e também quando o app fica tapado por completo por outras janelas
  autoPipWhenCovered: boolean;
  // …mas só durante um voo
  autoPipOnlyFlying: boolean;
  // Som que toca quando a mini janela aparece ("off" = sem som)
  pinSound: PinSound;
  // Feeder ligado: mostrar o voo dele (avião, servidor, altitude, velocidade) no Discord
  feederDiscord: boolean;
  // Ao abrir o app, o Feeder começa sozinho a procurar o Infinite Flight do dono da conta
  feederAutoStart: boolean;
  // Relógio no Discord: tempo que falta até chegar (com plano de voo) ou tempo já voado
  discordTime: "remaining" | "elapsed";
};

const STORAGE_KEY = "aerohub-connector.settings";

const DEFAULTS: AppSettings = {
  startWithWindows: true,
  discordAutopilot: true,
  autoUpdate: true,
  autoPip: false,
  autoPipWhenCovered: true,
  autoPipOnlyFlying: true,
  pinSound: "plim",
  feederDiscord: true,
  feederAutoStart: true,
  discordTime: "remaining",
};

export function loadSettings(): AppSettings {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULTS, ...(JSON.parse(saved) as Partial<AppSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

// Avisa o resto do app (ex.: a mini janela) quando uma opção muda
export const SETTINGS_CHANGED_EVENT = "aerohub-connector:settings-changed";

export function saveSettings(patch: Partial<AppSettings>) {
  const next = { ...loadSettings(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sem armazenamento disponível: a escolha vale só até fechar o app
  }
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  return next;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const update = (patch: Partial<AppSettings>) => setSettings(saveSettings(patch));
  return [settings, update] as const;
}
