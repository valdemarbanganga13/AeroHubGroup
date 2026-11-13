import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { supabase, supabaseConfigured } from "./supabase";
import type { UplinkState } from "./feeder";

// Dá à parte em Rust o endereço do servidor e a sessão da conta, para o voo do Feeder chegar ao AeroHub Radar.
// A sessão dura cerca de 1 hora e renova-se sozinha; envia-se de novo sempre que muda. Com a janela minimizada a renovação
// automática pode parar, por isso também se pede de CHECK_EVERY_MS em CHECK_EVERY_MS (getSession renova a que está perto do fim)
// e logo que o servidor a recusar. O token só passa daqui para o Rust e do Rust para o servidor.

const SERVER_URL = (import.meta.env.VITE_FEEDER_SERVER_URL as string | undefined) || "wss://aerohubradar.com/api/feeder/ws";
const CHECK_EVERY_MS = 4 * 60_000;
const isTauri = "__TAURI_INTERNALS__" in window;

export function useFeederSession(enabled: boolean) {
  useEffect(() => {
    if (!isTauri || !supabaseConfigured) return;
    const send = async () => {
      const { data } = enabled ? await supabase.auth.getSession() : { data: { session: null } };
      await invoke("feeder_set_session", { url: SERVER_URL, token: data.session?.access_token ?? null });
    };
    void send();
    if (!enabled) return;
    const timer = window.setInterval(() => void send(), CHECK_EVERY_MS);
    const { data: auth } = supabase.auth.onAuthStateChange(() => {
      // Fora do aviso: chamar o Supabase dentro dele pode ficar preso
      window.setTimeout(() => void send(), 0);
    });
    const refused = listen<UplinkState>("feeder://uplink", (event) => {
      if (event.payload === "needs_login") void supabase.auth.refreshSession().then(send);
    });
    return () => {
      window.clearInterval(timer);
      auth.subscription.unsubscribe();
      void refused.then((off) => off());
    };
  }, [enabled]);
}
