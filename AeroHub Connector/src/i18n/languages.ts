// Línguas do AeroHub Connector. Cada uma aparece no seu próprio nome.
export const LANGUAGES = [
  { code: "en", name: "English", flag: "/flags/us.svg" },
  { code: "pt", name: "Português", flag: "/flags/pt.svg" },
  { code: "es", name: "Español", flag: "/flags/es.svg" },
  { code: "fr", name: "Français", flag: "/flags/fr.svg" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

// Língua inicial: a do Windows, se for uma das nossas; senão, inglês
export function detectLanguage(): Language {
  const system = navigator.language.slice(0, 2).toLowerCase();
  return LANGUAGES.find((language) => language.code === system)?.code ?? "en";
}
