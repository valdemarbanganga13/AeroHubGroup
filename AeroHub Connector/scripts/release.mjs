// Publicar uma versão nova do AeroHub Connector:
//
//   npm run release 0.2.0
//   npm run release 0.2.0 "Deteção de voos mais rápida." "Correções no Discord."
//
// Muda a versão em todo o lado, cria o "commit" e a etiqueta (tag) v0.2.0 com as novidades
// e envia para o GitHub. O GitHub Actions (.github/workflows/release.yml) compila, assina e
// publica em aerohub-connector-releases; os apps instalados recebem a versão sozinhos.

import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [version, ...notes] = process.argv.slice(2);

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  fail('Indica a versão nova, por exemplo: npm run release 0.2.0 "Novidade 1" "Novidade 2"');
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
if (!newer(version, pkg.version)) {
  fail(`A versão nova (${version}) tem de ser maior do que a atual (${pkg.version}).`);
}

// Só se publica o que já está guardado no git (para a versão bater certo com o código)
if (git("status", "--porcelain")) {
  fail("Há alterações por guardar. Faz commit (ou descarta) antes de publicar.");
}

// package.json e package-lock.json (o tauri.conf.json lê a versão do package.json)
pkg.version = version;
fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
lock.version = version;
if (lock.packages?.[""]) lock.packages[""].version = version;
fs.writeFileSync("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);

// Cargo.toml e Cargo.lock (parte em Rust)
const replaceIn = (file, pattern, replacement) => {
  const text = fs.readFileSync(file, "utf8");
  if (!pattern.test(text)) fail(`Não encontrei a versão em ${file}.`);
  fs.writeFileSync(file, text.replace(pattern, replacement));
};
replaceIn("src-tauri/Cargo.toml", /^version = ".*"$/m, `version = "${version}"`);
replaceIn(
  "src-tauri/Cargo.lock",
  /(name = "aerohub-connector"\r?\nversion = )".*"/,
  `$1"${version}"`,
);

const tag = `v${version}`;
const message = notes.length > 0 ? notes.map((note) => `- ${note}`).join("\n") : "";

git("add", "package.json", "package-lock.json", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock");
git("commit", "-m", `Release ${tag}`);
git("tag", "-a", tag, "-m", message || `AeroHub Connector ${tag}`);
git("push", "origin", "HEAD", "--follow-tags");

console.log(`\n✔ ${tag} enviada. O GitHub Actions está a compilar e publicar (10–15 minutos).`);
console.log("  Acompanhar: https://github.com/valdemarbanganga13/aerohub-connector-app/actions\n");
