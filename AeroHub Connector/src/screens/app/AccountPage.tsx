import { useState } from "react";
import AvatarContent from "../../components/AvatarContent";
import ExternalLink from "../../components/ExternalLink";
import { InfiniteFlightIcon } from "../../components/SocialLinks";
import { LINKS } from "../../config/links";
import { useI18n } from "../../i18n/I18nProvider";
import { useAccount } from "../../lib/account";

// Perfil: só para ver a conta (editar nome, foto… faz-se no site da AeroHub Radar).
// - Cartão da conta: avatar, nome e e-mail
// - Licença do AeroHub Connector: ativa e desde quando
// - Contas ligadas: Infinite Flight — ligada (o @) ou "Adicionar" (abre o site)
//   (o Discord não precisa: o status vai pelo app do Discord aberto no computador)
// - Gerir conta no site e terminar sessão (com confirmação → volta às Boas-vindas)
// A conta vem do login na AeroHub Radar (src/lib/account.tsx).

type AccountPageProps = {
  onSignOut: () => void;
};

export default function AccountPage({ onSignOut }: AccountPageProps) {
  const { t, language } = useI18n();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const { account } = useAccount();
  const a = t.app.account;

  if (!account) return null;

  const licenseSince = account.licenseSince
    ? new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(account.licenseSince))
    : null;

  return (
    <div className="page account">
      <header className="page-header" data-tauri-drag-region>
        <h1 className="page-header__title">{t.app.nav.account}</h1>
        <p className="page-header__subtitle">{a.subtitle}</p>
      </header>

      {/* Cartão da conta */}
      <section className="account-profile">
        <span className="account-profile__avatar">
          <AvatarContent url={account.avatarUrl} initials={account.initials} />
        </span>
        <div className="account-profile__info">
          <p className="account-profile__name">{account.displayName}</p>
          <p className="account-profile__meta">
            {account.email} · {a.radarAccount}
          </p>
        </div>
      </section>

      {/* Licença do AeroHub Connector */}
      <section className="settings-section">
        <h2 className="settings-section__title">{a.license}</h2>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row__text">
              <p className="settings-row__title">{a.licenseTitle}</p>
              {licenseSince && <p className="settings-row__description">{a.since(licenseSince)}</p>}
            </div>
            <span className="status-badge is-ok">
              <span className="status-badge__dot" aria-hidden="true" />
              {a.active}
            </span>
          </div>
        </div>
      </section>

      {/* Contas ligadas */}
      <section className="settings-section">
        <h2 className="settings-section__title">{a.linkedAccounts}</h2>
        <div className="settings-card">
          <div className="settings-row">
            <div className="linked-account">
              <span className="linked-account__icon">
                <InfiniteFlightIcon />
              </span>
              <div className="settings-row__text">
                <p className="settings-row__title">Infinite Flight</p>
                <p className="settings-row__description">
                  {account.ifcVerified && account.ifcUsername ? `@${account.ifcUsername}` : a.notLinked}
                </p>
              </div>
            </div>
            {account.ifcVerified && account.ifcUsername ? (
              <span className="status-badge is-ok">
                <span className="status-badge__dot" aria-hidden="true" />
                {a.linked}
              </span>
            ) : (
              <ExternalLink className="btn btn-ghost account-add" href={LINKS.linkInfiniteFlight}>
                {a.add}
              </ExternalLink>
            )}
          </div>
        </div>
      </section>

      {/* Ações */}
      <div className="account-actions">
        <ExternalLink className="account-actions__manage" href={LINKS.manageAccount}>
          {a.manage}
        </ExternalLink>
        <button className="account-actions__signout" type="button" onClick={() => setConfirmingSignOut(true)}>
          {a.signOut}
        </button>
      </div>

      {/* Confirmação de terminar sessão */}
      {confirmingSignOut && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setConfirmingSignOut(false)}>
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="signout-title" className="dialog__title">
              {a.signOutConfirm}
            </h2>
            <p className="dialog__text">{a.signOutText}</p>
            <div className="dialog__actions">
              <button className="btn btn-ghost" type="button" onClick={() => setConfirmingSignOut(false)}>
                {a.cancel}
              </button>
              <button className="btn btn-danger" type="button" onClick={onSignOut}>
                {a.signOut}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

