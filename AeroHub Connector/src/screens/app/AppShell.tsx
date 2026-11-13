import { useEffect, useRef, useState } from "react";
import WindowControls from "../../components/WindowControls";
import LogoIcon from "../../components/brand/LogoIcon";
import { CORNER_ICON, SIDEBAR_ICON } from "../../components/brand/introLayout";
import { flyIcon } from "../../components/brand/flyIcon";
import { useI18n } from "../../i18n/I18nProvider";
import { useFlightStatus, type PilotState } from "../../lib/flightStatus";
import { useFeederPilot } from "../../lib/feederFlight";
import { useFeederCallsign } from "../../lib/feederCallsign";
import { useFeederSession } from "../../lib/feederSession";
import { feederOwner, feederStatusNow, loadFeederPrefs, setFeederRate, startFeeder, stopFeeder } from "../../lib/feeder";
import { useAccount } from "../../lib/account";
import { useDiscordPresence } from "../../lib/useDiscordPresence";
import { SETTINGS_CHANGED_EVENT, loadSettings } from "../../lib/settings";
import { checkForUpdate, installUpdate } from "../../lib/updater";
import { configurePip, destroyPip, preloadPip, showPipAndMinimize } from "../../pip/pipWindow";
import Sidebar, { type Page } from "./Sidebar";
import HomePage from "./HomePage";
import SettingsPage from "./SettingsPage";
import ProductsPage from "./ProductsPage";
import FeederPage from "./FeederPage";
import StoragePage from "./StoragePage";
import AccountPage from "./AccountPage";
import "./app.css";

// Parte principal do app (depois do login): barra lateral + página escolhida.
// Ao entrar depois do login, o logo do canto (vindo da tela de sucesso) voa para o topo da barra lateral.
// Ao abrir o app, a animação de abertura já o deixa no topo da barra lateral: aqui fica parado.
//
// Picture-in-Picture: o botão ⧉ no Início abre a mini janela com o status e minimiza o app.
// Com "Fixar estado no ecrã automaticamente" (Definições), a mini janela também abre sozinha
// quando o app é minimizado e, se escolhido, quando fica tapado por completo por outras janelas
// (e, se escolhido, só durante um voo).
// Quando o app volta a aparecer (pela mini janela, pela barra de tarefas ou por deixar de estar
// tapado), a mini janela fecha.
// A mini janela fica pronta (escondida) enquanto esta parte do app está aberta; quem a mostra
// e esconde na hora é a parte em Rust (src-tauri/src/pip.rs).
//
// Discord: enquanto esta parte do app está aberta, o status do voo aparece no Discord.
// Feeder ligado: o voo vem do Infinite Flight direto (Início sempre; Discord se "Mostrar no meu Discord").
// "Ligar automaticamente" (página Feeder): ao abrir o app o Feeder começa sozinho a procurar o Infinite Flight
// do dono da conta (e fica à procura até o encontrar). Só uma vez por abertura: se a pessoa carregar em
// "Desligar", fica desligado até voltar a abrir o app.


const AUTO_UPDATE_EVERY_MS = 30 * 60 * 1000;

// Passa as escolhas das Definições para a parte em Rust.
// A mini janela é o cartão do voo: só existe durante um voo; sem voo nunca abre.
function sendPipSettings(flying: boolean) {
  const settings = loadSettings();
  const autoMinimized = settings.autoPip && flying;
  configurePip({
    active: flying,
    autoMinimized,
    autoCovered: autoMinimized && settings.autoPipWhenCovered,
    sound: settings.pinSound,
  });
}

type AppShellProps = {
  // Definições → "Check for updates": abre o ecrã de atualização
  onCheckUpdates: () => void;
  // Perfil → "Terminar sessão": volta às Boas-vindas
  onSignOut: () => void;
  // De onde vem o logo: do canto (tela de sucesso do login) ou já da barra lateral (abertura do app)
  logoFrom?: "corner" | "sidebar";
  // Página com que abre (normalmente o Início; as fotos da galeria do site abrem outras)
  initialPage?: Page;
  // Só para as fotos da galeria do site: um voo de exemplo em vez do estado real
  demoPilot?: PilotState;
};

export default function AppShell({
  onCheckUpdates,
  onSignOut,
  logoFrom = "corner",
  initialPage = "home",
  demoPilot,
}: AppShellProps) {
  const { language, t } = useI18n();
  const [page, setPage] = useState<Page>(initialPage);
  const logoRef = useRef<HTMLDivElement>(null);

  // Estado do voo real (servidor do AeroHub Radar); null = sem status disponível
  const liveStatus = useFlightStatus();
  // Feeder: só com o Infinite Flight da conta verificado no AeroHub Radar (senão não liga nem mostra nada)
  const { account } = useAccount();
  const ownerUser = feederOwner(account);
  const feederFlight = useFeederPilot(t.app.feeder.live.onGround);
  // Indicativo do voo: pedido uma vez por voo (só com a conta verificada)
  useFeederCallsign(!demoPilot && !!ownerUser);
  useFeederSession(!demoPilot && !!ownerUser);
  const feederPilot = ownerUser ? feederFlight : null;
  const pilot = demoPilot ?? feederPilot ?? liveStatus;
  const flight = pilot?.flight ?? null;
  const flying = flight !== null;

  // Arranque automático do Feeder (precisa do nome do Infinite Flight da conta)
  // Conta sem Infinite Flight verificado (ou deixou de estar): o Feeder desliga
  useEffect(() => {
    if (!demoPilot && account && !ownerUser) void stopFeeder();
  }, [account, ownerUser, demoPilot]);
  const autoStarted = useRef(false);
  useEffect(() => {
    if (demoPilot || autoStarted.current || !ownerUser) return;
    autoStarted.current = true;
    const prefs = loadFeederPrefs();
    void setFeederRate(prefs.rate);
    if (!loadSettings().feederAutoStart) return;
    if (prefs.mode === "manual" && !prefs.ip.trim()) return;
    void feederStatusNow().then((status) => {
      if (status.state === "off") void startFeeder(prefs.mode, prefs.ip.trim(), ownerUser);
    });
  }, [ownerUser, demoPilot]);

  // "Mostrar no meu Discord" (página Feeder): muda na hora
  const [feederDiscord, setFeederDiscord] = useState(() => loadSettings().feederDiscord);
  useEffect(() => {
    const read = () => setFeederDiscord(loadSettings().feederDiscord);
    window.addEventListener(SETTINGS_CHANGED_EVENT, read);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, read);
  }, []);

  // A voar: o voo aparece no Discord; sem voo, o status sai do Discord
  useDiscordPresence(demoPilot || (feederPilot && !feederDiscord) ? null : flight);

  useEffect(() => {
    const logo = logoRef.current;
    if (!logo || logoFrom === "sidebar") return;
    const animation = flyIcon(logo, SIDEBAR_ICON, null);
    return () => animation.cancel();
  }, []);

  // Mini janela pronta e escondida (criada de novo quando a língua muda); lê o voo sozinha
  useEffect(() => {
    void preloadPip({ lang: language });
    return () => void destroyPip();
  }, [language]);

  // Definições → "Instalar atualizações automaticamente": procura ao entrar e de 30 em 30 minutos;
  // se houver versão nova, descarrega e instala (o app fecha e volta a abrir já atualizado).
  // Não corre em `npm run tauri dev`, para não instalar a versão publicada por cima do teste.
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const run = async () => {
      if (!loadSettings().autoUpdate) return;
      try {
        const update = await checkForUpdate();
        if (update) await installUpdate(update);
      } catch {
        // Sem internet ou servidor indisponível: tenta outra vez da próxima
      }
    };
    void run();
    const timer = window.setInterval(run, AUTO_UPDATE_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Abertura automática: as escolhas seguem para o Rust agora, quando mudam e quando um voo começa ou acaba
  useEffect(() => {
    const send = () => sendPipSettings(flying);
    send();
    window.addEventListener(SETTINGS_CHANGED_EVENT, send);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, send);
  }, [flying]);
  useEffect(() => () => configurePip({ active: false, autoMinimized: false, autoCovered: false, sound: "off" }), []);

  return (
    <main className="card app" data-tauri-drag-region>
      <Sidebar page={page} onNavigate={setPage} />

      {/* Começa onde estava o ícone na tela anterior (canto ou já na barra lateral) */}
      <div ref={logoRef} className="app-logo logo-static" style={logoFrom === "sidebar" ? SIDEBAR_ICON : CORNER_ICON}>
        <LogoIcon />
      </div>

      <WindowControls />

      <div className="app-content" key={page}>
        {page === "home" && <HomePage pilot={pilot} onPictureInPicture={showPipAndMinimize} />}
        {page === "products" && <ProductsPage />}
        {page === "feeder" && <FeederPage />}
        {page === "storage" && <StoragePage />}
        {page === "settings" && <SettingsPage onCheckUpdates={onCheckUpdates} />}
        {page === "account" && <AccountPage onSignOut={onSignOut} />}
      </div>
    </main>
  );
}
