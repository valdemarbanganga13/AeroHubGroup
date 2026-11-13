import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "../i18n/I18nProvider";

// Botões da janela (minimizar e fechar) no canto superior direito.
// Sem botão de ecrã inteiro: a janela tem sempre 555×555.
const isTauri = "__TAURI_INTERNALS__" in window;

export default function WindowControls() {
  const { t } = useI18n();
  const minimize = () => {
    if (isTauri) void getCurrentWindow().minimize();
  };
  const close = () => {
    if (isTauri) void getCurrentWindow().close();
  };

  return (
    <div className="window-controls">
      <button
        className="window-controls__button has-tooltip"
        type="button"
        aria-label={t.window.minimize}
        onClick={minimize}
      >
        <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="ui-tooltip ui-tooltip--below">{t.window.minimize}</span>
      </button>
      <button
        className="window-controls__button window-controls__button--close has-tooltip"
        type="button"
        aria-label={t.window.close}
        onClick={close}
      >
        <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="ui-tooltip ui-tooltip--below">{t.window.close}</span>
      </button>
    </div>
  );
}
