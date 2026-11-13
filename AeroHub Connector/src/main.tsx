import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PipView from "./pip/PipView";
import { I18nProvider } from "./i18n/I18nProvider";
import { LANGUAGES, type Language } from "./i18n/languages";
import { applyInstallerPrefs, applyStartWithWindows } from "./lib/firstRun";
import { loadSettings } from "./lib/settings";
import "@fontsource-variable/inter";
import "./styles.css";

// A mesma página serve as duas janelas:
// - janela principal → o app
// - mini janela (?view=pip) → só o cartão do status (Picture-in-Picture)
const params = new URLSearchParams(window.location.search);
const isPip = params.get("view") === "pip";
const pipLanguage = LANGUAGES.find((language) => language.code === params.get("lang"))?.code as Language | undefined;

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

if (isPip) {
  root.render(
    <React.StrictMode>
      <I18nProvider initialLanguage={pipLanguage}>
        <PipView />
      </I18nProvider>
    </React.StrictMode>,
  );
} else {
  // Primeira abertura depois do instalador: aplica a língua e as escolhas antes de mostrar o app
  void applyInstallerPrefs().then((firstRun) => {
    // "Start with Windows" / "Open at login": confirma a escolha a cada abertura
    // (no Mac não há instalador que o faça; no Windows também corrige o caminho se o app mudar de pasta)
    applyStartWithWindows(loadSettings().startWithWindows);
    root.render(
      <React.StrictMode>
        <App firstRun={firstRun} />
      </React.StrictMode>,
    );
  });
}
