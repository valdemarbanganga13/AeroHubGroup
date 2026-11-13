import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadAccount, pingDevice, signOutRadar, touchActivity, type RadarAccount } from "./radarAccount";
import { supabase } from "./supabase";

// A conta com sessão iniciada, partilhada por todos os ecrãs do app (Início, Perfil, barra lateral…).
// Enquanto o app está aberto: marca atividade, diz ao site que este computador está ligado
// e volta a ver a licença de 30 em 30 minutos. Desligado no site (Connections) → sai da conta.
// Se o perfil ou a licença mudarem (nome, foto, reembolso…), o app atualiza na hora (Supabase Realtime).

const CHECK_EVERY_MS = 30 * 60 * 1000;

type AccountContextValue = {
  account: RadarAccount | null;
  // Volta a ler a conta e a licença do servidor
  refresh: () => Promise<RadarAccount | null>;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

// initialAccount: só para a ferramenta das fotos da galeria (src/capture), que mostra uma conta de exemplo
export function AccountProvider({ children, initialAccount = null }: { children: ReactNode; initialAccount?: RadarAccount | null }) {
  const [account, setAccount] = useState<RadarAccount | null>(initialAccount);

  const refresh = useCallback(async () => {
    const next = await loadAccount();
    setAccount(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await signOutRadar();
    setAccount(null);
  }, []);

  // Este computador foi desligado no site? Então sai da conta aqui (falhas de ligação não contam)
  const checkDevice = useCallback(() => {
    void pingDevice()
      .then((connected) => {
        if (!connected) void signOut();
      })
      .catch(() => {});
  }, [signOut]);

  // Com sessão: "estou ativo" agora e de 30 em 30 minutos (falhas de ligação não terminam a sessão)
  const signedIn = account !== null && account.id !== "demo";
  useEffect(() => {
    if (!signedIn) return;
    const tick = () => {
      void touchActivity().catch(() => {});
      checkDevice();
      void refresh().catch(() => {});
    };
    void touchActivity().catch(() => {});
    checkDevice();
    const timer = window.setInterval(tick, CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [signedIn, refresh, checkDevice]);

  // A sessão acabou por fora (ex.: desligado no site e o servidor já não a aceita): volta a "sem conta"
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setAccount(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Perfil alterado no site (ex.: foto nova) ou licença alterada (compra, reembolso, banimento):
  // volta a ler a conta logo. Sem licença, o App.tsx leva a pessoa de volta às Boas-vindas.
  const accountId = account?.id;
  useEffect(() => {
    if (!accountId || accountId === "demo") return;
    const reload = () => void refresh().catch(() => {});
    const channel = supabase
      .channel(`account-${accountId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${accountId}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "entitlements", filter: `user_id=eq.${accountId}` }, reload)
      // Um computador foi desligado no site: se foi este, sai da conta na hora
      // (só reage a desligar; as atualizações da "última atividade" não contam)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "connector_devices", filter: `user_id=eq.${accountId}` },
        (payload) => {
          if ((payload.new as { revoked_at?: string | null }).revoked_at) checkDevice();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accountId, refresh, checkDevice]);

  const value = useMemo(() => ({ account, refresh, signOut }), [account, refresh, signOut]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside <AccountProvider>");
  return value;
}
