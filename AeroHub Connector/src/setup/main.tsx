import ReactDOM from "react-dom/client";
import { I18nProvider } from "../i18n/I18nProvider";
import Installer from "../screens/installer/Installer";
import { setupBackend } from "../screens/installer/installBackend";
import "@fontsource-variable/inter";
import "../styles.css";

// AeroHub Connector Setup (o setup.exe que se descarrega): as telas de instalação,
// a instalar de verdade (installer/src-tauri). A língua escolhida segue para o app.
// Sem React.StrictMode: em desenvolvimento ele corre os efeitos duas vezes,
// o que começaria a instalação duas vezes.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <I18nProvider>
    <Installer backend={setupBackend} />
  </I18nProvider>,
);
