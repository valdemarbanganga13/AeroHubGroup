import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, detectLanguage, type Language } from "./languages";
import { TRANSLATIONS, type Translations } from "./translations";

// Guarda a língua escolhida e dá os textos certos a todas as telas.
// Ao mudar a língua, tudo o que usa useI18n() atualiza logo.

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
};

const I18nContext = createContext<I18nValue | null>(null);

type I18nProviderProps = {
  children: ReactNode;
  // Língua inicial (ex.: a mini janela recebe a língua do app); senão, a guardada ou a do Windows
  initialLanguage?: Language;
  // Lembrar a língua escolhida para a próxima vez que o app abrir
  remember?: boolean;
};

const STORAGE_KEY = "aerohub-connector.language";

function savedLanguage(): Language | undefined {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((language) => language.code === saved) ? (saved as Language) : undefined;
  } catch {
    return undefined;
  }
}

export function I18nProvider({ children, initialLanguage, remember = false }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>(
    () => initialLanguage ?? (remember ? savedLanguage() : undefined) ?? detectLanguage(),
  );

  useEffect(() => {
    document.documentElement.lang = language;
    if (!remember) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Sem armazenamento: volta à língua do Windows da próxima vez
    }
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: TRANSLATIONS[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n tem de ser usado dentro do I18nProvider");
  return value;
}
