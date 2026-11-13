import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Language } from "../../i18n/languages";
import type { Translations } from "../../i18n/translations";
import type { InstallOptions } from "./OptionsStep";

// Quem faz a instalação por trás das telas:
// - no AeroHub Connector Setup (setup.exe): a parte em Rust (installer/src-tauri), de verdade
// - no app em `npm run tauri dev` (VITE_START_SCREEN=installer): ninguém — é só a demonstração

export type InstallTask = keyof Translations["installing"]["tasks"];

export type InstallEvent =
  | { phase: "copying"; bytes: number; total: number }
  | { phase: "task"; task: InstallTask }
  | { phase: "done" }
  | { phase: "error"; message: string };

export type InstallBackend = {
  install: (options: InstallOptions, language: Language, onEvent: (event: InstallEvent) => void) => Promise<() => void>;
  launch: (installPath: string) => Promise<void>;
};

export const setupBackend: InstallBackend = {
  async install(options, language, onEvent) {
    const unlisten = await listen<InstallEvent>("setup-progress", (event) => onEvent(event.payload));
    await invoke("setup_install", {
      request: {
        installPath: options.installPath,
        desktopShortcut: options.desktopShortcut,
        startWithWindows: options.startWithWindows,
        language,
      },
    });
    return unlisten;
  },
  launch: (installPath) => invoke("setup_launch_app", { installPath }),
};
