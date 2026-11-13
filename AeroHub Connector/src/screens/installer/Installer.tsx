import { useEffect, useRef, useState } from "react";
import { localDataDir } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import LogoIcon from "../../components/brand/LogoIcon";
import { CORNER_ICON, INTRO_ICON_STYLE, WINDOW_SIZE, WORDMARK_ICON } from "../../components/brand/introLayout";
import { flyIcon, type IconBox } from "../../components/brand/flyIcon";
import WelcomeStep from "./WelcomeStep";
import TermsStep from "./TermsStep";
import OptionsStep, { APP_FOLDER_NAME, type InstallOptions } from "./OptionsStep";
import InstallingStep from "./InstallingStep";
import DoneStep from "./DoneStep";
import WindowControls from "../../components/WindowControls";
import { useI18n } from "../../i18n/I18nProvider";
import { saveSettings } from "../../lib/settings";
import type { InstallBackend } from "./installBackend";
import "./installer.css";

// Instalador: um fluxo de passos dentro da mesma janela.
// O ícone do logo é partilhado entre os passos e voa de um lugar para o outro:
// - Boas-vindas: ao lado do nome "AeroHub Connector"
// - Termos, Opções e A instalar: sozinho, no canto superior esquerdo
// - Concluído: grande, no centro, a redesenhar-se a traço de 10 em 10 segundos
// No AeroHub Connector Setup (setup.exe) instala de verdade (backend); no app em
// `npm run tauri dev` é a demonstração.

type Step = "welcome" | "terms" | "options" | "installing" | "done";

const isTauri = "__TAURI_INTERNALS__" in window;

// Ícone no centro da página final
const DONE_ICON_WIDTH = 170;
const DONE_ICON = { left: (WINDOW_SIZE - DONE_ICON_WIDTH) / 2, top: 130, width: DONE_ICON_WIDTH };

// Página final: quando começa o primeiro redesenho, de quanto em quanto tempo
// se repete e quando aparece o botão Finish (depois da animação do logo)
const DONE_FIRST_REDRAW_MS = 800;
const DONE_REDRAW_EVERY_MS = 10_000;
const DONE_READY_MS = 3600;

// Onde fica o ícone em cada passo
const ICON_BOX: Record<Step, IconBox> = {
  welcome: WORDMARK_ICON,
  terms: CORNER_ICON,
  options: CORNER_ICON,
  installing: CORNER_ICON,
  done: DONE_ICON,
};

type InstallerProps = {
  // Demonstração: chamado no Finish quando "Launch AeroHub Connector" está marcado
  onLaunchApp?: () => void;
  // Instalação real (setup.exe)
  backend?: InstallBackend;
};

export default function Installer({ onLaunchApp, backend }: InstallerProps) {
  const { t, language } = useI18n();
  const [installFailed, setInstallFailed] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [options, setOptions] = useState<InstallOptions>({
    installPath: `C:\\Users\\<user>\\AppData\\Local\\${APP_FOLDER_NAME}`,
    desktopShortcut: true,
    startWithWindows: true,
  });
  const [installComplete, setInstallComplete] = useState(false);
  const [launchApp, setLaunchApp] = useState(true);
  const [doneReady, setDoneReady] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const iconAnimation = useRef<Animation | null>(null);

  // Pasta de instalação por defeito: %LOCALAPPDATA%\AeroHub Connector
  useEffect(() => {
    if (!isTauri) return;
    void localDataDir().then((dir) => {
      const installPath = `${dir.replace(/[\\/]+$/, "")}\\${APP_FOLDER_NAME}`;
      setOptions((current) => ({ ...current, installPath }));
    });
  }, []);

  // Página final: o logo redesenha-se a traço logo ao chegar e depois de 10 em 10 s
  useEffect(() => {
    if (step !== "done") return;
    const redraw = () => {
      const icon = iconRef.current;
      if (!icon) return;
      icon.classList.remove("is-redrawing");
      void icon.offsetWidth; // reinicia a animação
      icon.classList.add("is-redrawing");
    };
    const first = window.setTimeout(redraw, DONE_FIRST_REDRAW_MS);
    const ready = window.setTimeout(() => setDoneReady(true), DONE_READY_MS);
    const repeat = window.setInterval(redraw, DONE_REDRAW_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(ready);
      window.clearInterval(repeat);
    };
  }, [step]);

  function goTo(next: Step) {
    const icon = iconRef.current;
    // Só anima se o ícone mudar mesmo de lugar (ex.: Termos → Opções fica parado)
    if (icon && ICON_BOX[next] !== ICON_BOX[step]) {
      iconAnimation.current = flyIcon(icon, ICON_BOX[next], iconAnimation.current);
    }
    setStep(next);
  }

  function handleNext() {
    if (step === "welcome") goTo("terms");
    else if (step === "terms") goTo("options");
    else if (step === "options") goTo("installing");
    else if (step === "installing" && installFailed) closeWindow();
    else if (step === "installing" && installComplete) goTo("done");
    else if (step === "done") finish();
  }

  function closeWindow() {
    if (isTauri) void getCurrentWindow().close();
  }

  async function finish() {
    // Instalação real: abre o app instalado (já na língua escolhida) e fecha o instalador
    if (backend) {
      if (launchApp) await backend.launch(options.installPath).catch(() => {});
      closeWindow();
      return;
    }
    // Demonstração: a escolha passa a ser o valor inicial nas Definições do app
    saveSettings({ startWithWindows: options.startWithWindows });
    if (!launchApp) {
      closeWindow();
      return;
    }
    onLaunchApp?.();
  }

  function handleBack() {
    if (step === "terms") goTo("welcome");
    else if (step === "options") goTo("terms");
  }

  // Back: aparece uma vez depois do primeiro Next e fica parado entre Termos e Opções.
  // Durante a instalação não há botões; o Next só volta quando acabar.
  // Na página final, o Finish só aparece depois da animação do logo.
  const backVisible = step === "terms" || step === "options";
  // Se a instalação falhar, o botão passa a "Fechar"
  const nextHidden =
    (step === "installing" && !installComplete && !installFailed) || (step === "done" && !doneReady);
  const nextLabel =
    step === "options"
      ? t.buttons.install
      : step === "done"
        ? t.buttons.finish
        : step === "installing" && installFailed
          ? t.window.close
          : t.buttons.next;

  return (
    <main className="card installer" data-tauri-drag-region>
      <WindowControls />

      <div ref={iconRef} className="intro-icon" style={INTRO_ICON_STYLE}>
        <LogoIcon />
      </div>

      <div className={`installer-step ${step === "welcome" ? "is-active" : ""}`}>
        <WelcomeStep />
      </div>

      <div className={`installer-step ${step === "terms" ? "is-active" : ""}`}>
        <TermsStep accepted={termsAccepted} onAcceptedChange={setTermsAccepted} />
      </div>

      <div className={`installer-step ${step === "options" ? "is-active" : ""}`}>
        <OptionsStep options={options} onChange={setOptions} />
      </div>

      <div className={`installer-step ${step === "installing" ? "is-active" : ""}`}>
        <InstallingStep
          active={step === "installing"}
          options={options}
          language={language}
          backend={backend}
          onComplete={() => setInstallComplete(true)}
          onError={() => setInstallFailed(true)}
        />
      </div>

      <div className={`installer-step ${step === "done" ? "is-active" : ""}`}>
        {step === "done" && <DoneStep launchApp={launchApp} onLaunchChange={setLaunchApp} />}
      </div>

      <button
        className={`btn btn-ghost installer-back ${backVisible ? "" : "is-hidden"}`}
        type="button"
        disabled={!backVisible}
        onClick={handleBack}
      >
        {t.buttons.back}
      </button>

      <button
        className={`btn btn-primary installer-next ${nextHidden ? "is-hidden" : ""}`}
        type="button"
        disabled={(step === "terms" && !termsAccepted) || nextHidden}
        onClick={handleNext}
      >
        {nextLabel}
      </button>
    </main>
  );
}
