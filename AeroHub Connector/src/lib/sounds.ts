import { invoke } from "@tauri-apps/api/core";

// Sons da mini janela (Definições → "Som ao fixar").
// Quem toca é a parte em Rust, pelo sistema de som do Windows (src-tauri/src/sound.rs).

export const PIN_SOUNDS = ["off", "plim", "drop", "marimba", "kalimba", "wood"] as const;

export type PinSound = (typeof PIN_SOUNDS)[number];

const isTauri = "__TAURI_INTERNALS__" in window;

export function playPinSound(sound: PinSound) {
  if (!isTauri || sound === "off") return;
  void invoke("play_pin_sound", { sound }).catch(() => {
    // Sem som disponível: segue em silêncio
  });
}
