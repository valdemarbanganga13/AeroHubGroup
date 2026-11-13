import { LINKS } from "../config/links";
import LIVERY_AIRLINES from "../data/livery-airlines.json";

// Logos das companhias aéreas, pelo código ICAO de 3 letras (ex.: TAP, AAL, DLH).
// Dentro do app usa-se a cópia local (public/airline-logos); no Discord, o endereço na internet.
// Quando uma companhia não tem logo, aparece o ícone "sem logo".

export const AIRLINE_NO_LOGO = "/icons/airline-no-logo.svg";

export function airlineLogoLocal(icao: string) {
  return `/airline-logos/${icao.toUpperCase()}.png`;
}

// Pintura do Infinite Flight → código ICAO da companhia (ex.: "United Airlines - 2019" → UAL).
// Lista feita a partir das pinturas do jogo e da lista de companhias do AeroHub Radar, só com as que têm logo
// (src/data/livery-airlines.json). Pinturas novas: tenta o nome antes do " - " (ex.: "Delta Air Lines - Retro").
// Sem correspondência (militares, privados, pinturas genéricas): "" (aparece o ícone "sem logo").
const LIVERIES = LIVERY_AIRLINES as Record<string, string>;
export function airlineIcaoForLivery(livery: string) {
  const name = livery.trim();
  return LIVERIES[name] ?? LIVERIES[name.split(" - ")[0].trim()] ?? "";
}

// Confirma se existe logo para esta companhia (na cópia local)
export function airlineLogoExists(icao: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = airlineLogoLocal(icao);
  });
}

// Endereço na internet para o Discord: o logo, ou o ícone "sem logo" se a companhia não tiver
export async function airlineLogoUrlForDiscord(icao: string) {
  const base = LINKS.airlineLogosBaseUrl;
  if (!base) return undefined;
  return (await airlineLogoExists(icao)) ? `${base}${icao.toUpperCase()}.png` : LINKS.airlineNoLogoUrl;
}
