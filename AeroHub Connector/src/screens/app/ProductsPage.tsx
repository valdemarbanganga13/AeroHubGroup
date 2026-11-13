import type { ReactNode } from "react";
import ExternalLink from "../../components/ExternalLink";
import LogoIcon from "../../components/brand/LogoIcon";
import { LINKS } from "../../config/links";
import { useI18n } from "../../i18n/I18nProvider";

// Produtos do AeroHub: cada cartão mostra o ícone do produto e abre o site no browser.

type Product = {
  name: string;
  description: string;
  href: string;
  icon: ReactNode;
};

export default function ProductsPage() {
  const { t } = useI18n();

  const products: Product[] = [
    {
      name: "AeroHub Radar",
      description: t.app.products.radar,
      href: LINKS.aerohubRadar,
      icon: <img src="/logos/aerohub-radar.svg" alt="" />,
    },
    {
      name: "AeroHub Photos",
      description: t.app.products.photos,
      href: LINKS.aerohubPhotos,
      icon: <img src="/logos/aerohub-photos.svg" alt="" />,
    },
    {
      name: "AeroHub Connector",
      description: t.app.products.connector,
      href: LINKS.connectorWebsite,
      icon: (
        <span className="product-card__connector logo-static">
          <LogoIcon />
        </span>
      ),
    },
    {
      name: "AeroHub Forms",
      description: t.app.products.forms,
      href: LINKS.aerohubForms,
      icon: <FormsIcon />,
    },
    {
      name: "AeroHub Support",
      description: t.app.products.support,
      href: LINKS.aerohubSupport,
      // A mesma imagem da pessoa a pensar do site de suporte
      icon: <img className="product-card__support" src="/logos/aerohub-support.svg" alt="" />,
    },
  ];

  return (
    <div className="page products">
      <header className="page-header" data-tauri-drag-region>
        <h1 className="page-header__title">{t.app.nav.products}</h1>
        <p className="page-header__subtitle">{t.app.products.subtitle}</p>
      </header>

      <ul className="product-list">
        {products.map((product) => {
          const content = (
            <>
              <span className="product-card__icon" aria-hidden="true">
                {product.icon}
              </span>
              <span className="product-card__text">
                <span className="product-card__name">{product.name}</span>
                <span className="product-card__description">{product.description}</span>
                <span className={`product-card__link ${product.href ? "" : "is-soon"}`}>
                  {product.href ? product.href.replace("https://", "") : t.app.products.linkSoon}
                </span>
              </span>
            </>
          );
          return (
            <li key={product.name}>
              {/* Sem endereço ainda: o cartão aparece, mas não abre nada */}
              {product.href ? (
                <ExternalLink className="product-card" href={product.href}>
                  {content}
                </ExternalLink>
              ) : (
                <div className="product-card is-disabled">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Ícone do AeroHub Forms: dois balões de conversa (um branco e um verde)
function FormsIcon() {
  return (
    <svg className="product-card__forms" viewBox="-103 -65 206 164" fill="none" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
      <path
        d="M-78 -58h96a18 18 0 0 1 18 18v52a18 18 0 0 1-18 18h-54l-30 24v-24h-12a18 18 0 0 1-18-18v-52a18 18 0 0 1 18-18z"
        stroke="#FFFFFF"
      />
      <path
        d="M54 -6h24a18 18 0 0 1 18 18v42a18 18 0 0 1-18 18h-6v20l-26-20h-34a18 18 0 0 1-18-18v-8"
        stroke="#8FD14F"
      />
    </svg>
  );
}
