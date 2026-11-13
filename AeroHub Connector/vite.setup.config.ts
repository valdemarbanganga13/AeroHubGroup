import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Parte visual do AeroHub Connector Setup (installer/src-tauri): só a página setup.html
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1422,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**", "**/installer/**"] },
  },
  build: {
    outDir: "dist-setup",
    emptyOutDir: true,
    rollupOptions: { input: "setup.html" },
  },
});
