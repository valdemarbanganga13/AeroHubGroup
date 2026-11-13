import { useEffect, useRef, useState } from "react";
import { version } from "../../../package.json";
import WindowControls from "../../components/WindowControls";
import LogoIcon, { LOGO_ICON_VIEWBOX } from "../../components/brand/LogoIcon";
import LogoWordmarkText from "../../components/brand/LogoWordmarkText";
import {
  CORNER_ICON,
  INTRO_ICON_STYLE,
  WINDOW_SIZE,
  WORDMARK_ICON,
  WORDMARK_TEXT_STYLE,
} from "../../components/brand/introLayout";
import { flyIcon } from "../../components/brand/flyIcon";
import AvatarContent from "../../components/AvatarContent";
import ExternalLink from "../../components/ExternalLink";
import { LINKS } from "../../config/links";
import { useI18n } from "../../i18n/I18nProvider";
import { useAccount } from "../../lib/account";
import { openRadarPage, signInWithRadar, SignInCancelled } from "../../lib/radarAccount";
import "./welcome.css";

// Tela de Boas-vindas do app (primeira vez que abre, ou depois de terminar sessão).
// 1. Abertura: o ícone grande desenha-se com "Welcome" por baixo e sobe para o lado do nome.
// 2. "Sign in with AeroHub Radar": o resto desaparece, o ícone desce para o centro e
//    repete o efeito da abertura em ciclo (a processar). O site do Radar abre no browser
//    e o app mostra o código que a pessoa confere lá antes de carregar em "Allow" (src/lib/radarAccount.ts).
// 3. Resultado: o ícone acaba o ciclo, sobe para o canto e aparece:
//    - sucesso;
//    - sem acesso: a conta entrou, mas não tem a licença do AeroHub Connector;
//    - erro: não foi possível entrar (ligação, servidor, pedido expirado…).
// Com sessão já iniciada (ex.: voltou depois de comprar), "Sign in" só volta a ver a licença.

type SignInResult = "success" | "denied" | "error";
type SignInState = "idle" | "processing" | SignInResult;

const PROCESSING_ICON_WIDTH = 170;
const PROCESSING_ICON = {
  left: (WINDOW_SIZE - PROCESSING_ICON_WIDTH) / 2,
  top: (WINDOW_SIZE - (PROCESSING_ICON_WIDTH * LOGO_ICON_VIEWBOX.height) / LOGO_ICON_VIEWBOX.width) / 2,
  width: PROCESSING_ICON_WIDTH,
};

// Com o código para conferir no ecrã, o ícone sobe para o conjunto (ícone, "Processing", código) ficar centrado
const PROCESSING_ICON_WITH_CODE = { ...PROCESSING_ICON, top: 142 };

// Se o fim do ciclo do logo não chegar a tempo (ex.: janela minimizada), para na mesma
const SETTLE_FALLBACK_MS = 3000;

type WelcomeScreenProps = {
  // Next na tela de sucesso: entra na parte principal do app (vem depois)
  onContinue: () => void;
};

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const { t } = useI18n();
  const { account, refresh, signOut } = useAccount();
  const [state, setState] = useState<SignInState>("idle");
  // Código para conferir no site e endereço da página (para "abrir o browser outra vez")
  const [code, setCode] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const iconAnimation = useRef<Animation | null>(null);
  const timers = useRef<number[]>([]);
  const signInAbort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      signInAbort.current?.abort();
    },
    [],
  );

  // Chegou o código: o ícone sobe para dar lugar ao código por baixo
  const showCode = state === "processing" && code !== null;
  useEffect(() => {
    const icon = iconRef.current;
    if (!showCode || !icon) return;
    iconAnimation.current = flyIcon(icon, PROCESSING_ICON_WITH_CODE, iconAnimation.current);
  }, [showCode]);

  async function startSignIn() {
    const icon = iconRef.current;
    if (!icon) return;
    setState("processing");
    setCode(null);
    setConnectUrl(null);
    iconAnimation.current = flyIcon(icon, PROCESSING_ICON, iconAnimation.current);
    icon.classList.remove("is-settled");
    icon.classList.add("is-processing");

    const controller = new AbortController();
    signInAbort.current = controller;
    let result: SignInResult;
    try {
      // Já com sessão: só volta a ver a licença. Sem sessão: abre o site do Radar e espera o "Allow".
      let current = await refresh();
      if (!current) {
        await signInWithRadar({ signal: controller.signal, onCode: setCode, onLink: setConnectUrl });
        current = await refresh();
      }
      result = !current ? "error" : current.hasLicense ? "success" : "denied";
    } catch (error) {
      if (error instanceof SignInCancelled) {
        icon.classList.remove("is-processing");
        icon.classList.add("is-settled");
        backToStart();
        return;
      }
      console.error("Sign-in failed:", error);
      result = "error";
    } finally {
      signInAbort.current = null;
    }
    finishSignIn(result);
  }

  function cancelSignIn() {
    signInAbort.current?.abort();
  }

  // Sem licença: "Back" sai da conta (para poder entrar com outra)
  async function leaveDenied() {
    await signOut().catch(() => {});
    backToStart();
  }

  // Espera o fim do ciclo do logo (quando já tem cor) para parar sem saltos
  function finishSignIn(result: SignInResult) {
    const icon = iconRef.current;
    const fill = icon?.querySelector(".logo-icon__fill");
    if (!icon || !fill) return;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      icon.classList.remove("is-processing");
      icon.classList.add("is-settled");
      iconAnimation.current = flyIcon(icon, CORNER_ICON, iconAnimation.current);
      setState(result);
    };
    fill.addEventListener("animationiteration", settle, { once: true });
    timers.current.push(window.setTimeout(settle, SETTLE_FALLBACK_MS));
  }

  function backToStart() {
    const icon = iconRef.current;
    if (icon) iconAnimation.current = flyIcon(icon, WORDMARK_ICON, iconAnimation.current);
    setState("idle");
  }

  return (
    <main className={`card welcome is-${state}${showCode ? " has-code" : ""}`} data-tauri-drag-region>
      <WindowControls />

      <div ref={iconRef} className="intro-icon" style={INTRO_ICON_STYLE}>
        <LogoIcon />
      </div>
      <p className="welcome-splash">{t.welcomeScreen.splash}</p>

      {/* Por baixo do ícone, enquanto o login processa */}
      <p className="welcome-processing" aria-live="polite">
        {t.welcomeScreen.processing}
        <span className="welcome-processing__dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>

      {/* Código para conferir no site do Radar antes de carregar em "Allow" */}
      <div className="welcome-code" aria-live="polite">
        {code && (
          <>
            <p className="welcome-code__label">{t.welcomeScreen.confirmCode}</p>
            <p className="welcome-code__value">{code}</p>
            <p className="welcome-code__actions">
              <button
                className="welcome-code__link"
                type="button"
                onClick={() => connectUrl && void openRadarPage(connectUrl)}
              >
                {t.welcomeScreen.reopenBrowser}
              </button>
              <span aria-hidden="true">·</span>
              <button className="welcome-code__link" type="button" onClick={cancelSignIn}>
                {t.welcomeScreen.cancel}
              </button>
            </p>
          </>
        )}
      </div>

      {/* Início: nome, título e botão de entrar */}
      <div className="welcome-stage">
        <div className="intro-wordmark-text" style={WORDMARK_TEXT_STYLE}>
          <LogoWordmarkText />
        </div>

        <section className="welcome-intro">
          <h1 className="welcome-intro__title">{t.welcomeScreen.title}</h1>
          <p className="welcome-intro__subtitle">{t.welcomeScreen.subtitle}</p>
        </section>

        <button
          className="btn btn-primary welcome-signin"
          type="button"
          onClick={() => void startSignIn()}
        >
          <span>{t.welcomeScreen.signIn}</span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {state === "success" && (
        <div className="welcome-result">
          <span className="result-badge result-badge--success" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 12.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="welcome-result__title">{t.signIn.successTitle}</h1>
          <p className="welcome-result__text">{t.signIn.successSubtitle}</p>

          <div className="account-card">
            <span className="account-card__avatar">
              <AvatarContent url={account?.avatarUrl} initials={account?.initials} />
            </span>
            <span className="account-card__info">
              <span className="account-card__name">{account?.displayName}</span>
              <span className="account-card__label">
                {account?.email} · {t.signIn.account}
              </span>
            </span>
          </div>

          <button className="btn btn-primary welcome-action welcome-action--right" type="button" onClick={onContinue}>
            {t.buttons.next}
          </button>
        </div>
      )}

      {state === "denied" && (
        <div className="welcome-result">
          <span className="result-badge result-badge--denied" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="2" />
              <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="welcome-result__title">{t.signIn.deniedTitle}</h1>
          <p className="welcome-result__text">{t.signIn.deniedMessage}</p>
          <ExternalLink className="welcome-result__link" href={LINKS.connectorWebsite}>
            {t.signIn.getConnector}
          </ExternalLink>

          <button className="btn btn-ghost welcome-action welcome-action--left" type="button" onClick={() => void leaveDenied()}>
            {t.buttons.back}
          </button>
          <button
            className="btn btn-primary welcome-action welcome-action--right"
            type="button"
            onClick={() => void startSignIn()}
          >
            {t.signIn.tryAgain}
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="welcome-result">
          <span className="result-badge result-badge--error" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 7v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1.4" fill="currentColor" />
            </svg>
          </span>
          <h1 className="welcome-result__title">{t.signIn.errorTitle}</h1>
          <p className="welcome-result__text">{t.signIn.errorMessage}</p>

          <button className="btn btn-ghost welcome-action welcome-action--left" type="button" onClick={backToStart}>
            {t.buttons.back}
          </button>
          <button
            className="btn btn-primary welcome-action welcome-action--right"
            type="button"
            onClick={() => void startSignIn()}
          >
            {t.signIn.tryAgain}
          </button>
        </div>
      )}

      <p className="welcome-credit">
        {t.welcome.by} <strong>AeroHub Group</strong>
        <span className="welcome-credit__version">· v{version}</span>
      </p>
    </main>
  );
}
