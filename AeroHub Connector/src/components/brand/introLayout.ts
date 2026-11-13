import type { CSSProperties } from "react";
import { LOGO_ICON_VIEWBOX } from "./LogoIcon";
import { WORDMARK_ICON_BOX, WORDMARK_TEXT_BOX, WORDMARK_VIEWBOX } from "./LogoWordmarkText";

// Medidas da animação de abertura, partilhadas pelo instalador e pela tela de Boas-vindas:
// o ícone grande no centro desenha-se, encolhe e sobe até ao lado do nome "AeroHub Connector".
export const WINDOW_SIZE = 555;

// Logo com nome (fim da animação): sempre a 102px da margem superior
export const WORDMARK_TOP = 102;
export const WORDMARK_WIDTH = 360;
export const WORDMARK_SCALE = WORDMARK_WIDTH / WORDMARK_VIEWBOX.width;
export const WORDMARK_LEFT = (WINDOW_SIZE - WORDMARK_WIDTH) / 2;

// Ícone grande no centro (início da animação)
const INTRO_ICON_WIDTH = 270;
const iconRatio = LOGO_ICON_VIEWBOX.height / LOGO_ICON_VIEWBOX.width;

export const INTRO_ICON = {
  width: INTRO_ICON_WIDTH,
  height: INTRO_ICON_WIDTH * iconRatio,
  left: (WINDOW_SIZE - INTRO_ICON_WIDTH) / 2,
  top: (WINDOW_SIZE - INTRO_ICON_WIDTH * iconRatio) / 2,
};

// Onde o ícone fica no fim: ao lado do nome
export const WORDMARK_ICON = {
  width: WORDMARK_ICON_BOX.width * WORDMARK_SCALE,
  left: WORDMARK_LEFT + WORDMARK_ICON_BOX.x * WORDMARK_SCALE,
  top: WORDMARK_TOP + WORDMARK_ICON_BOX.y * WORDMARK_SCALE,
};

// Ícone pequeno no canto superior esquerdo (passos seguintes do instalador, sucesso do login…)
export const CORNER_ICON = { left: 32, top: 30, width: 48 };

// Ícone no topo da barra lateral do app (onde fica enquanto o app está aberto)
export const SIDEBAR_ICON = { left: 18, top: 28, width: 36 };

// Estilo do ícone da abertura (classe .intro-icon em logo.css)
export const INTRO_ICON_STYLE = {
  aspectRatio: `${LOGO_ICON_VIEWBOX.width} / ${LOGO_ICON_VIEWBOX.height}`,
  "--intro-left": `${INTRO_ICON.left}px`,
  "--intro-top": `${INTRO_ICON.top}px`,
  "--intro-width": `${INTRO_ICON.width}px`,
  "--final-left": `${WORDMARK_ICON.left}px`,
  "--final-top": `${WORDMARK_ICON.top}px`,
  "--final-width": `${WORDMARK_ICON.width}px`,
} as CSSProperties;

// Estilo do texto "AeroHub Connector" ao lado do ícone (classe .intro-wordmark-text)
export const WORDMARK_TEXT_STYLE: CSSProperties = {
  left: WORDMARK_LEFT + WORDMARK_TEXT_BOX.x * WORDMARK_SCALE,
  top: WORDMARK_TOP + WORDMARK_TEXT_BOX.y * WORDMARK_SCALE,
  width: WORDMARK_TEXT_BOX.width * WORDMARK_SCALE,
  height: WORDMARK_TEXT_BOX.height * WORDMARK_SCALE,
};
