import Checkbox from "../../components/Checkbox";
import { useI18n } from "../../i18n/I18nProvider";

// Passo 2 — Termos de uso.
// Mostra só um resumo dos pontos importantes; os termos completos estão no site.
// O botão Next (no Installer) só fica ativo depois de o utilizador aceitar.
// Os textos estão em src/i18n/translations.tsx.

type TermsStepProps = {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
};

export default function TermsStep({ accepted, onAcceptedChange }: TermsStepProps) {
  const { t } = useI18n();

  return (
    <>
      <header className="step-header">
        <h1 className="step-header__title">{t.terms.title}</h1>
        <p className="step-header__subtitle">{t.terms.subtitle}</p>
      </header>

      <div className="terms-summary">
        <ul className="terms-points">
          {t.terms.points.map((point) => (
            <li key={point.title} className="terms-points__item">
              <span className="terms-points__dot" aria-hidden="true" />
              <p>
                <strong>{point.title}.</strong> {point.body}
              </p>
            </li>
          ))}
        </ul>

        <p className="terms-notice">
          <InfoIcon />
          <span>{t.terms.notice}</span>
        </p>
      </div>

      <Checkbox className="terms-accept" checked={accepted} onChange={onAcceptedChange}>
        {t.terms.accept}
      </Checkbox>
    </>
  );
}

function InfoIcon() {
  return (
    <svg className="terms-notice__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.25v3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
    </svg>
  );
}
