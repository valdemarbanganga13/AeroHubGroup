import { LANGUAGES, type Language } from "../i18n/languages";
import Select from "./Select";

// Menu de línguas com bandeira.
type LanguageSelectProps = {
  value: Language;
  onChange: (language: Language) => void;
  // Para onde abre a lista: por baixo (padrão) ou por cima (quando está no fundo da janela)
  placement?: "bottom" | "top";
};

const OPTIONS = LANGUAGES.map((language) => ({
  value: language.code,
  label: language.name,
  icon: <img className="select__flag" src={language.flag} alt="" />,
}));

export default function LanguageSelect({ value, onChange, placement }: LanguageSelectProps) {
  return <Select value={value} options={OPTIONS} onChange={onChange} placement={placement} />;
}
