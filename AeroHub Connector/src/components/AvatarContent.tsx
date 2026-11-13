import { useEffect, useState } from "react";

// O que vai dentro dos círculos de perfil: a foto da conta (escolhida no site do Radar)
// ou as iniciais, se não houver foto ou se ela não carregar. GIF continua animado.

type AvatarContentProps = {
  url: string | null | undefined;
  initials: string | undefined;
};

export default function AvatarContent({ url, initials }: AvatarContentProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return <img className="avatar-photo" src={url} alt="" draggable={false} onError={() => setFailed(true)} />;
  }
  return <>{initials}</>;
}
