import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { supabase, supabaseConfigured } from "./supabase";

// Conta AeroHub Radar no app: entrar ("Sign in with AeroHub Radar"), licença e atividade.
//
// Como se entra (sem escrever a password no app):
// 1. O app cria um pedido no Supabase com uma chave secreta (só guarda o "hash" dela lá) e recebe um código curto.
// 2. Abre o site do Radar em /connect; a pessoa entra na conta, confere o código e carrega em "Allow".
// 3. O app pergunta de 2 em 2 segundos à função do servidor se já foi aprovado (mostrando a chave secreta);
//    quando sim, recebe um bilhete de uso único e troca-o por uma sessão.

const isTauri = "__TAURI_INTERNALS__" in window;
const RADAR_SITE = (import.meta.env.VITE_RADAR_SITE_URL as string | undefined) || "https://aerohubradar.com";
const LINK_FUNCTION = (import.meta.env.VITE_CONNECTOR_LINK_FUNCTION as string | undefined) || "connector-link-claim";
const POLL_MS = 2000;

export type RadarAccount = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  // Foto do perfil (escolhida no site do Radar; GIF continua animado). null = mostra as iniciais
  avatarUrl: string | null;
  ifcUsername: string | null;
  ifcVerified: boolean;
  // Tem o AeroHub Connector (licença válida e conta não banida)
  hasLicense: boolean;
  // Desde quando tem a licença (data ISO), se tiver
  licenseSince: string | null;
};

// A pessoa carregou em "Cancel" (no app ou no site)
export class SignInCancelled extends Error {
  constructor() {
    super("Sign-in cancelled");
  }
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(text: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new SignInCancelled());
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new SignInCancelled());
      },
      { once: true },
    );
  });
}

export function openRadarPage(url: string) {
  if (isTauri) return openUrl(url);
  window.open(url, "_blank", "noopener");
  return Promise.resolve();
}

async function deviceName() {
  if (!isTauri) return "Browser";
  try {
    return await invoke<string>("device_name");
  } catch {
    return "Windows PC";
  }
}

// Conta com sessão iniciada neste computador (null = sem sessão).
// Falhas de ligação lançam erro (não terminam a sessão).
export async function loadAccount(): Promise<RadarAccount | null> {
  if (!supabaseConfigured) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const user = session.user;
  const [profileResult, accessResult, licenseResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, ifc_username, ifc_verified_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("has_access", { p_product: "connector" }),
    supabase.from("entitlements").select("starts_at").eq("user_id", user.id).eq("product_id", "connector").maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (accessResult.error) throw accessResult.error;

  const profile = profileResult.data;
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Pilot";
  const hasLicense = accessResult.data === true;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    initials: initialsOf(displayName),
    avatarUrl: profile?.avatar_url ?? null,
    ifcUsername: profile?.ifc_username ?? null,
    ifcVerified: Boolean(profile?.ifc_verified_at),
    hasLicense,
    licenseSince: hasLicense ? (licenseResult.data?.starts_at ?? null) : null,
  };
}

// "Sign in with AeroHub Radar": abre o site e espera que a pessoa aprove.
// onCode recebe o código curto para mostrar no app; onLink o endereço (para "abrir outra vez").
export async function signInWithRadar(options: {
  signal: AbortSignal;
  onCode: (code: string) => void;
  onLink: (url: string) => void;
}) {
  const { signal } = options;
  const secret = toHex(crypto.getRandomValues(new Uint8Array(32)));

  const { data, error } = await supabase.rpc("connector_link_start", {
    p_secret_hash: await sha256Hex(secret),
    p_device_name: await deviceName(),
  });
  if (error || !data) throw error ?? new Error("Could not start sign-in");
  if (signal.aborted) throw new SignInCancelled();

  const request = data as { request_id: string; user_code: string; expires_at: string };
  const connectUrl = `${RADAR_SITE}/connect?request=${request.request_id}`;
  options.onCode(request.user_code);
  options.onLink(connectUrl);
  await openRadarPage(connectUrl);

  const deadline = new Date(request.expires_at).getTime();
  while (Date.now() < deadline) {
    await wait(POLL_MS, signal);

    const { data: claim, error: claimError } = await supabase.functions.invoke(LINK_FUNCTION, {
      body: { request_id: request.request_id, secret },
    });
    if (claimError) {
      // Resposta "não" do servidor (pedido inválido): para. Falha de ligação: tenta outra vez.
      if (claimError.name === "FunctionsHttpError") throw new Error("Sign-in request rejected");
      continue;
    }

    if (claim?.status === "pending") continue;
    if (claim?.status === "denied") throw new SignInCancelled();
    if (claim?.status === "approved" && claim.token_hash) {
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: claim.token_hash, type: "email" });
      if (otpError) throw otpError;
      // Este computador passa a aparecer no site do Radar (Account › Connections)
      await pingDevice().catch(() => {});
      return;
    }
    throw new Error(`Sign-in failed (${claim?.status ?? "unknown"})`);
  }
  throw new Error("Sign-in request expired");
}

// Marca a conta como ativa (para não ser desativada por 30 dias sem uso). O servidor só grava de 10 em 10 min.
export async function touchActivity() {
  if (!supabaseConfigured) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) await supabase.rpc("touch_activity");
}

// Diz ao servidor que o app está ligado neste computador (aparece no site do Radar, em Account › Connections,
// com o nome do PC e a última atividade). Devolve false se este computador foi desligado no site.
export async function pingDevice(): Promise<boolean> {
  if (!supabaseConfigured) return true;
  const { data, error } = await supabase.rpc("connector_device_ping", { p_device_name: await deviceName() });
  if (error) throw error;
  return data === true;
}

// Termina a sessão só neste computador
export async function signOutRadar() {
  await supabase.auth.signOut({ scope: "local" });
}
