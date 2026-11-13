import DiscordPresenceCard from "../components/DiscordPresenceCard";
import { useI18n } from "../i18n/I18nProvider";
import { useNow } from "../lib/time";
import { useFlightStatus } from "../lib/flightStatus";
import { useFeederPilot } from "../lib/feederFlight";
import { dismissPip, openAppFromPip } from "./pipWindow";
import "./pip.css";

// Conteúdo da mini janela: o cartão do status, a contar o tempo de voo.
// Clicar abre o app completo (e o cartão volta para dentro dele). O ✕ esconde só a mini janela.
// (A janela fica escondida e pronta, para voltar a aparecer na hora.)
// Lê o voo real sozinha (a mesma sessão do app); sem voo não mostra nada (e o app nem a abre).
// Com o Feeder ligado, mostra o voo dele (como o Início).

export default function PipView() {
  const { t } = useI18n();
  const now = useNow();
  const serverFlight = useFlightStatus()?.flight ?? null;
  // Voo do Feeder (o app principal só o liga com o Infinite Flight da conta verificado)
  const feederFlight = useFeederPilot(t.app.feeder.live.onGround)?.flight ?? null;
  const flight = feederFlight ?? serverFlight;
  if (!flight) return null;

  return (
    <div className="pip" role="button" tabIndex={0} aria-label={t.app.home.pipOpen} onClick={openAppFromPip}>
      <DiscordPresenceCard flight={flight} now={now} />
      <button
        className="pip__close"
        type="button"
        aria-label={t.window.close}
        onClick={(event) => {
          event.stopPropagation();
          dismissPip();
        }}
      >
        <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
