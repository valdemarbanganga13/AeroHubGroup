import ExternalLink from "./ExternalLink";
import SocialLinks from "./SocialLinks";
import { LINKS } from "../config/links";
import { useI18n } from "../i18n/I18nProvider";

// Rodapé da página Início: termos do AeroHub Connector e, por baixo, as redes sociais
export default function AppFooter() {
  const { t } = useI18n();
  return (
    <footer className="app-footer">
      <p className="app-footer__legal">
        <ExternalLink href={LINKS.termsOfService}>{t.app.legal.terms}</ExternalLink>
        <span aria-hidden="true">·</span>
        <ExternalLink href={LINKS.privacyPolicy}>{t.app.legal.privacy}</ExternalLink>
      </p>
      <SocialLinks />
    </footer>
  );
}
