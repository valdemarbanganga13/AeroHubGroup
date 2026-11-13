// Ícone do AeroHub (os dois elos). Fonte original: public/logos/logo-icon.svg
// O viewBox está recortado ao desenho para facilitar o posicionamento.
//
// Duas camadas:
// - outline: o contorno de cada elo, usado na animação de "stroke draw"
// - fill: o ícone com cor. Nos cruzamentos, o elo de baixo continua inteiro por
//   baixo do de cima (pontes), para não aparecer uma fresta escura nas junções.
import "./logo.css";

export const LOGO_ICON_VIEWBOX ={ x: 20.13, y: 96, width: 460.5, height: 307 };

const v = LOGO_ICON_VIEWBOX;

const GREEN_LINK =
  "M382.907 185.286H267.014C243.026 186.611 220.268 196.334 202.728 212.752C185.188 229.17 173.983 251.235 171.077 275.084H207.405C210.193 261.12 217.579 248.493 228.384 239.218C239.188 229.943 252.789 224.556 267.014 223.917H382.907C400.351 224.909 416.697 232.75 428.388 245.735C440.078 258.719 446.168 275.796 445.33 293.248C446.169 310.726 440.088 327.831 428.404 340.856C416.719 353.881 400.373 361.778 382.907 362.834H267.014C252.789 362.195 239.188 356.808 228.384 347.533C217.579 338.259 210.193 325.632 207.405 311.668H171.077C173.646 335.793 184.703 358.221 202.275 374.95C219.847 391.679 242.792 401.62 267.014 403H382.907C410.284 401.415 435.924 389.066 454.232 368.649C472.541 348.232 482.032 321.403 480.635 294.015C481.962 266.67 472.44 239.907 454.139 219.546C435.838 199.185 410.238 186.872 382.907 185.286Z";

const BLUE_LINK =
  "M233.756 275.083H117.863C109.157 274.593 100.633 272.39 92.7795 268.599C84.9263 264.809 77.8986 259.505 72.0993 252.993C66.3 246.481 61.8432 238.888 58.9845 230.649C56.1257 222.411 54.9212 213.69 55.4399 204.985C54.6004 187.507 60.6817 170.402 72.3662 157.377C84.0507 144.351 100.397 136.455 117.863 135.398H233.756C247.981 136.038 261.582 141.425 272.386 150.699C283.191 159.974 290.954 171.578 293.742 185.542H329.558C326.82 161.555 315.823 140.331 298.267 123.758C280.711 107.185 257.861 97.3531 233.756 96H117.863C90.4855 97.5855 64.8458 109.934 46.5375 130.351C28.2292 150.768 18.7382 177.597 20.1349 204.985C18.8078 232.33 28.3301 259.093 46.6313 279.454C64.9324 299.815 90.5321 312.128 117.863 313.714H233.756C257.744 312.389 280.502 302.666 298.042 286.248C315.582 269.83 326.787 247.765 329.693 223.916H293.365C290.577 237.88 283.191 250.508 272.386 259.782C261.582 269.057 247.981 274.444 233.756 275.083Z";

// Sombra onde o elo azul sai de baixo do verde
const SHADE =
  "M233.756 275.083H157.006V314.482H233.756C257.861 313.128 280.711 303.296 298.267 286.723C315.824 270.15 326.955 247.904 329.693 223.917H293.365C290.577 237.881 283.191 250.508 272.386 259.782C261.582 269.057 247.981 274.444 233.756 275.083Z";

export default function LogoIcon() {
  return (
    <svg
      className="logo-icon"
      viewBox={`${v.x} ${v.y} ${v.width} ${v.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AeroHub"
    >
      <g className="logo-icon__fill">
        {/* Elo verde + ponte por baixo do azul (cruzamento da esquerda) */}
        <path d={GREEN_LINK} fill="url(#logo-icon-green)" />
        <rect x="171.3" y="274" width="36.1" height="39" fill="url(#logo-icon-green)" />

        {/* Elo azul + ponte por baixo do verde (cruzamento da direita) */}
        <path d={BLUE_LINK} fill="url(#logo-icon-blue)" />
        <rect x="293.6" y="184.8" width="35.9" height="39.6" fill="url(#logo-icon-blue)" />

        <path d={SHADE} fill="url(#logo-icon-shade)" />

        {/* No cruzamento da direita o verde fica por cima: volta a ser desenhado só ali */}
        <path d={GREEN_LINK} fill="url(#logo-icon-green)" clipPath="url(#logo-icon-crossing)" />
      </g>

      <g className="logo-icon__outline">
        <path
          className="logo-icon__link logo-icon__link--green"
          d={GREEN_LINK}
          pathLength={1}
          stroke="url(#logo-icon-green)"
        />
        <path
          className="logo-icon__link logo-icon__link--blue"
          d={BLUE_LINK}
          pathLength={1}
          stroke="url(#logo-icon-blue)"
        />
      </g>

      <defs>
        <clipPath id="logo-icon-crossing">
          <rect x="285" y="175" width="55" height="60" />
        </clipPath>
        <linearGradient id="logo-icon-green" x1="325.856" y1="403" x2="325.856" y2="185.286" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5E9624" />
          <stop offset="0.01" stopColor="#5E9724" />
          <stop offset="0.35" stopColor="#6CAB29" />
          <stop offset="0.68" stopColor="#73B82C" />
          <stop offset="1" stopColor="#76BC2D" />
        </linearGradient>
        <linearGradient id="logo-icon-blue" x1="174.914" y1="313.714" x2="174.914" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#008BFD" />
          <stop offset="0.82" stopColor="#5EA0EF" />
        </linearGradient>
        <linearGradient id="logo-icon-shade" x1="289.016" y1="193.728" x2="223.011" y2="287.875" gradientUnits="userSpaceOnUse">
          <stop stopColor="#005BA1" />
          <stop offset="0.14" stopColor="#035DA3" stopOpacity="0.97" />
          <stop offset="0.3" stopColor="#0B63AA" stopOpacity="0.88" />
          <stop offset="0.47" stopColor="#196EB6" stopOpacity="0.73" />
          <stop offset="0.65" stopColor="#2D7CC6" stopOpacity="0.52" />
          <stop offset="0.84" stopColor="#468EDB" stopOpacity="0.26" />
          <stop offset="1" stopColor="#5EA0EF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
