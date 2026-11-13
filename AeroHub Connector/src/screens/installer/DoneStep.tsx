import Checkbox from "../../components/Checkbox";
import { useI18n } from "../../i18n/I18nProvider";

// Passo 5 — Concluído. O ícone do logo (desenhado pelo Installer) desce para o centro
// e redesenha-se a traço; só depois aparecem o título, a frase e a caixa "Launch".
// Este componente só é montado quando o passo fica ativo, para as animações
// começarem nesse momento.

type DoneStepProps = {
  launchApp: boolean;
  onLaunchChange: (launch: boolean) => void;
};

export default function DoneStep({ launchApp, onLaunchChange }: DoneStepProps) {
  const { t } = useI18n();

  return (
    <>
      <section className="done-message">
        <h1 className="done-message__title">{t.done.title}</h1>
        <p className="done-message__text">{t.done.text}</p>
      </section>

      <Checkbox className="done-launch" checked={launchApp} onChange={onLaunchChange}>
        {t.done.launch}
      </Checkbox>
    </>
  );
}
