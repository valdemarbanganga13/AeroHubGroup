import type { ReactNode } from "react";
import AvatarContent from "../../components/AvatarContent";
import { useI18n } from "../../i18n/I18nProvider";
import { useAccount } from "../../lib/account";
import { useFeeder } from "../../lib/feeder";

// Barra lateral: logo no topo (desenhado pelo AppShell, para poder voar até aqui),
// o Início, os Produtos, o Feeder e o Armazenamento (voos gravados) em cima e, em baixo, as Definições junto ao perfil.
// O app abre sempre no Início.
// (AeroHub Radar e Photos são links para os sites, na página Início.)

export type Page = "home" | "products" | "feeder" | "storage" | "settings" | "account";

type SidebarProps = {
  page: Page;
  onNavigate: (page: Page) => void;
};

export default function Sidebar({ page, onNavigate }: SidebarProps) {
  const { t } = useI18n();
  const { account } = useAccount();
  // Feeder ligado: o ícone da antena fica verde e a emitir em qualquer página
  const feederLive = useFeeder().status.state === "connected";

  const item = (id: Page, label: string, icon: ReactNode) => (
    <button
      className={`sidebar__item sidebar__item--${id} ${page === id ? "is-active" : ""} ${id === "feeder" && feederLive ? "is-live" : ""}`}
      type="button"
      aria-label={label}
      aria-current={page === id ? "page" : undefined}
      onClick={() => onNavigate(id)}
    >
      {icon}
      <span className="sidebar__tooltip">{label}</span>
    </button>
  );

  return (
    <nav className="sidebar" data-tauri-drag-region>
      <div className="sidebar__group sidebar__group--top">
        {item("home", t.app.nav.home, <HomeIcon />)}
        {item("products", t.app.nav.products, <ProductsIcon />)}
        {item("feeder", t.app.nav.feeder, <FeederIcon />)}
        {item("storage", t.app.nav.storage, <StorageIcon />)}
      </div>

      <div className="sidebar__group">
        {item("settings", t.app.nav.settings, <SettingsIcon />)}
        <button
          className={`sidebar__account ${page === "account" ? "is-active" : ""}`}
          type="button"
          aria-label={t.app.nav.account}
          onClick={() => onNavigate("account")}
        >
          <AvatarContent url={account?.avatarUrl} initials={account?.initials} />
          <span className="sidebar__tooltip">{account?.displayName ?? t.app.nav.account}</span>
        </button>
      </div>
    </nav>
  );
}

// Casa em duas peças, para a animação "a construir-se": paredes (com a porta) e telhado
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        className="home-icon__walls"
        pathLength={1}
        d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.25h4V20h3.5a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="home-icon__roof"
        d="M3.5 11.25L12 4l8.5 7.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 4 quadrados que, quando a página está selecionada, se transformam em
// 2 retângulos + 2 quadrados (as posições estão em app.css)
function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect className="products-icon__tile products-icon__tile--1" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect className="products-icon__tile products-icon__tile--2" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect className="products-icon__tile products-icon__tile--3" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect className="products-icon__tile products-icon__tile--4" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

// Antena a emitir: o app manda a posição do avião para o AeroHub Radar
function FeederIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="11" r="1.9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 13v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        className="feeder-icon__wave feeder-icon__wave--1"
        d="M8.6 7.6a4.8 4.8 0 0 0 0 6.8M15.4 7.6a4.8 4.8 0 0 1 0 6.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        className="feeder-icon__wave feeder-icon__wave--2"
        d="M5.8 4.8a8.8 8.8 0 0 0 0 12.4M18.2 4.8a8.8 8.8 0 0 1 0 12.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Disco de armazenamento (3 camadas): os voos gravados neste PC
function StorageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="2.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 6v6c0 1.44 3.13 2.6 7 2.6s7-1.16 7-2.6V6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 12v6c0 1.44 3.13 2.6 7 2.6s7-1.16 7-2.6v-6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-1.9-3.3-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14.1 2.7h-3.8l-.4 2.4a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9L3.1 9l1.9 1.5a7.6 7.6 0 0 0 0 3L3.1 15l1.9 3.3 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.4h3.8l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2.3.9 1.9-3.3-1.9-1.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
