import { version } from "../../../package.json";
import LogoWordmarkText from "../../components/brand/LogoWordmarkText";
import { WORDMARK_TEXT_STYLE } from "../../components/brand/introLayout";
import { useI18n } from "../../i18n/I18nProvider";

// Passo 1 — Boas-vindas: nome do produto, apresentação e autor.
// (O ícone do logo é desenhado pelo Installer, porque passa de passo em passo.)

export default function WelcomeStep() {
  const { t } = useI18n();
  return (
    <>
      <div className="intro-wordmark-text" style={WORDMARK_TEXT_STYLE}>
        <LogoWordmarkText />
      </div>

      <section className="installer-about">
        <h1 className="installer-about__title">{t.welcome.title}</h1>
        <p className="installer-about__description">{t.welcome.description}</p>
      </section>

      <p className="installer-credit">
        {t.welcome.by} <strong>AeroHub Group</strong>
        <span className="installer-credit__version">· v{version}</span>
      </p>
    </>
  );
}
