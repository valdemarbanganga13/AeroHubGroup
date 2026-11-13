// AeroHub Connector Setup (o instalador com as nossas telas, em installer/src-tauri):
//
//   npm run setup:dev     abre o instalador em modo de demonstração (não instala nada)
//   npm run setup:build   gera installer/src-tauri/target/release/aerohub-connector-setup.exe
//
// Para o setup levar o app lá dentro (como no GitHub Actions), define antes:
//   AEROHUB_APP_INSTALLER = caminho do instalador do app (src-tauri/target/release/bundle/nsis/...-setup.exe)
//   AEROHUB_APP_SIZE      = tamanho do app instalado em bytes

import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (mode !== "dev" && mode !== "build") {
  console.error("Usa: node scripts/setup.mjs dev | build");
  process.exit(1);
}

const args = mode === "dev" ? ["tauri", "dev"] : ["tauri", "build", "--no-bundle"];
const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  // O Tauri usa este projeto (e não o do app em src-tauri)
  env: { ...process.env, TAURI_APP_PATH: "installer/src-tauri" },
});
process.exit(result.status ?? 1);
