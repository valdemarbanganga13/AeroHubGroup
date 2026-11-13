import { useEffect, useRef } from "react";
import WindowControls from "../../components/WindowControls";
import LogoIcon, { LOGO_ICON_VIEWBOX } from "../../components/brand/LogoIcon";
import { INTRO_ICON, SIDEBAR_ICON } from "../../components/brand/introLayout";
import { flyIcon } from "../../components/brand/flyIcon";
import "../update/update.css";

// Abertura do app (ao abrir e depois de uma atualização): só a animação do ícone.
// O ícone grande desenha-se a traço no centro, ganha cor e voa direto para o lugar onde fica
// no topo da barra lateral; só quando chega é que o Início (barra lateral e conteúdo) aparece.

const FLY_AT_MS = 2800;
const FLY_MS = 750;

type LaunchSplashProps = {
  onDone: () => void;
};

export default function LaunchSplash({ onDone }: LaunchSplashProps) {
  const iconRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let animation: Animation | null = null;
    const fly = window.setTimeout(() => {
      if (!iconRef.current) return;
      animation = flyIcon(iconRef.current, SIDEBAR_ICON, null);
      // Entra no Início assim que o ícone pousa (sem esperar por um temporizador à parte)
      animation.finished.then(
        () => onDoneRef.current(),
        () => {},
      );
    }, FLY_AT_MS);
    // Segurança: se a animação não terminar (janela escondida), entra na mesma
    const fallback = window.setTimeout(() => onDoneRef.current(), FLY_AT_MS + FLY_MS + 1500);
    return () => {
      window.clearTimeout(fly);
      window.clearTimeout(fallback);
      animation?.cancel();
    };
  }, []);

  return (
    <main className="card launch-splash" data-tauri-drag-region>
      <WindowControls />
      <div
        ref={iconRef}
        className="intro-icon"
        style={{
          animation: "none",
          left: INTRO_ICON.left,
          top: INTRO_ICON.top,
          width: INTRO_ICON.width,
          aspectRatio: `${LOGO_ICON_VIEWBOX.width} / ${LOGO_ICON_VIEWBOX.height}`,
        }}
      >
        <LogoIcon />
      </div>
    </main>
  );
}
