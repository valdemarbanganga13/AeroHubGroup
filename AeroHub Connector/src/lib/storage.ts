import { invoke } from "@tauri-apps/api/core";

// Voos gravados pelo Feeder neste PC (temporários; ver src-tauri/src/flight_log.rs).
// Servem para o rasto, os gráficos e o playback no AeroHub Radar; são apagados 1 hora depois de o voo acabar.

const isTauri = "__TAURI_INTERNALS__" in window;

export type StoredFlight = {
  key: string;
  aircraft: string | null;
  livery: string | null;
  origin: string | null;
  destination: string | null;
  startedAt: number;
  lastAt: number;
  points: number;
  bytes: number;
  // A ser gravado agora
  active: boolean;
  // Quando é apagado sozinho (ms); null = em pausa (o mesmo voo pode continuar)
  expiresAt: number | null;
};

export function listStoredFlights() {
  if (!isTauri) return Promise.resolve<StoredFlight[]>([]);
  return invoke<StoredFlight[]>("storage_list");
}

export function deleteStoredFlight(key: string) {
  if (!isTauri) return Promise.resolve();
  return invoke("storage_delete", { key });
}

export function deleteAllStoredFlights() {
  if (!isTauri) return Promise.resolve();
  return invoke("storage_delete_all");
}

// 1536 → "1.5 KB"
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
