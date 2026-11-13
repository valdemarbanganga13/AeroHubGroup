import { createClient } from "@supabase/supabase-js";

// Contas AeroHub Radar (projeto Supabase do Radar). O endereço e a chave pública ("anon")
// vêm do .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY); a chave secreta nunca entra no app.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY em falta no .env: o login não vai funcionar.");
}

export const supabase = createClient(url || "https://missing.supabase.co", anonKey || "missing-anon-key", {
  auth: {
    // A sessão fica guardada neste computador e renova-se sozinha
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "aerohub-connector.auth",
  },
});
