import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { version } from "../package.json";
import { I18nProvider } from "./i18n/I18nProvider";
import { AccountProvider, useAccount } from "./lib/account";
import { consumeJustUpdated } from "./lib/updater";
import Installer from "./screens/installer/Installer";
import WelcomeScreen from "./screens/welcome/WelcomeScreen";
import AppShell from "./screens/app/AppShell";
import UpdateScreen from "./screens/update/UpdateScreen";
import LaunchSplash from "./screens/launch/LaunchSplash";

// Abertura normal do app (já instalado e com sessão iniciada): animação do ícone → Início.
// Fase 1: localmente o app abre no instalador (cada `npm run tauri dev`), para se ver o design todo;
// com VITE_START_SCREEN=splash arranca como app instalado (ver .env.example).
// No Finish com "Launch" marcado, a janela fecha e volta a abrir já na tela de Boas-vindas,
// como se fosse o app instalado a abrir pela primeira vez.
// Depois de uma atualização, o app volta a abrir em "Atualização concluída";
// "Open AeroHub Connector" fecha e reabre a janela, mostra a animação do ícone e entra no Início.
// O sistema real (atalhos, abrir pelo .exe instalado) entra na fase do instalador.

type Screen = "installer" | "welcome" | "app" | "update" | "splash";

const isTauri = "__TAURI_INTERNALS__" in window;

// Ecrã com que o app arranca. Na Fase 2 isto passa a depender de o app estar instalado
// e de haver sessão iniciada (abertura → Início; sem sessão → Boas-vindas).
const START_SCREENS: Screen[] = ["installer", "welcome", "splash"];
const requestedStart = import.meta.env.VITE_START_SCREEN as Screen | undefined;
const START_SCREEN: Screen = requestedStart && START_SCREENS.includes(requestedStart) ? requestedStart : "installer";
const REOPEN_DELAY_MS = 700;

// Acabou de ser atualizado? Abre em "Atualização concluída" (ver src/lib/updater.ts)
const JUST_UPDATED_TO = consumeJustUpdated(version);

type AppProps = {
  // Primeira abertura depois do AeroHub Connector Setup: começa nas Boas-vindas
  firstRun?: boolean;
};

export default function App({ firstRun = false }: AppProps) {
  return (
    <I18nProvider remember>
      <AccountProvider>
        <Screens firstRun={firstRun} />
      </AccountProvider>
    </I18nProvider>
  );
}

function Screens({ firstRun }: { firstRun: boolean }) {
  const { account, refresh, signOut } = useAccount();
  const [screen, setScreen] = useState<Screen>(JUST_UPDATED_TO ? "update" : firstRun ? "welcome" : START_SCREEN);
  // "Atualização concluída" só aparece uma vez; depois o "Check for updates" volta a procurar
  const [justUpdatedTo, setJustUpdatedTo] = useState(JUST_UPDATED_TO);
  // De onde vem o logo ao entrar no Início: do canto (login, atualização) ou da abertura do app
  const [appLogoFrom, setAppLogoFrom] = useState<"corner" | "sidebar">("corner");

  function enterApp(logoFrom: "corner" | "sidebar") {
    setAppLogoFrom(logoFrom);
    setScreen("app");
  }

  // Só entra no Início com sessão iniciada e licença do AeroHub Connector; senão vai para as Boas-vindas
  async function enterIfAllowed(logoFrom: "corner" | "sidebar") {
    const current = await refresh().catch(() => null);
    if (current?.hasLicense) enterApp(logoFrom);
    else setScreen("welcome");
  }

  // Se a sessão terminar ou a licença deixar de valer com o app aberto, volta às Boas-vindas
  useEffect(() => {
    if (screen === "app" && (!account || !account.hasLicense)) setScreen("welcome");
  }, [screen, account]);

  async function handleSignOut() {
    await signOut().catch(() => {});
    setScreen("welcome");
  }

  // Simula "fecha e volta a abrir": a janela desaparece e volta, centrada, já com o ecrã seguinte
  async function reopenAt(next: Screen) {
    if (!isTauri) {
      setScreen(next);
      return;
    }
    const appWindow = getCurrentWindow();
    await appWindow.hide();
    setScreen(next);
    await new Promise((resolve) => setTimeout(resolve, REOPEN_DELAY_MS));
    await appWindow.center();
    await appWindow.show();
    await appWindow.setFocus();
  }

  return (
    <>
      {screen === "installer" && <Installer onLaunchApp={() => reopenAt("welcome")} />}
      {screen === "welcome" && <WelcomeScreen onContinue={() => enterApp("corner")} />}
      {screen === "app" && (
        <AppShell
          logoFrom={appLogoFrom}
          onCheckUpdates={() => setScreen("update")}
          onSignOut={() => void handleSignOut()}
        />
      )}
      {screen === "update" && (
        <UpdateScreen
          onBack={() => void enterIfAllowed("corner")}
          onOpenApp={() => {
            setJustUpdatedTo(null);
            void reopenAt("splash");
          }}
          justUpdatedTo={justUpdatedTo}
        />
      )}
      {screen === "splash" && <LaunchSplash onDone={() => void enterIfAllowed("sidebar")} />}
    </>
  );
}
