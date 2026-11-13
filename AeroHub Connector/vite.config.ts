import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**", "**/installer/**"] },
  },
  build: {
    // O app abre os ficheiros do próprio disco (não da internet), por isso um ficheiro maior não pesa;
    // o limite normal de 500 kB é pensado para sites
    chunkSizeWarningLimit: 1000,
  },
});
