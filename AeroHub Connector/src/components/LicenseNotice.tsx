import ExternalLink from "./ExternalLink";
import { LINKS } from "../config/links";
import { useI18n } from "../i18n/I18nProvider";

// Linha "Precisa de licença" com o botão "Obter licença" (abre a secção Licence do site).
// Aparece onde há opções do Discord e a conta não tem licença.
export default function LicenseNotice({ text }: { text?: string }) {
  const { t } = useI18n();
  const l = t.app.license;
  return (
    <div className="settings-row license-notice">
      <div className="settings-row__text">
        <p className="settings-row__title">{l.needed}</p>
        <p className="settings-row__description">{text ?? l.discordOnly}</p>
      </div>
      <ExternalLink className="btn btn-primary license-notice__button" href={LINKS.buyLicense}>
        {l.get}
      </ExternalLink>
    </div>
  );
}
