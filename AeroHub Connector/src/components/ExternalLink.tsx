import type { MouseEvent, ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

// Link que abre no browser do utilizador (e não dentro da janela do app).
const isTauri = "__TAURI_INTERNALS__" in window;

type ExternalLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export default function ExternalLink({ href, children, className }: ExternalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Evita também que o clique marque a caixa quando o link está dentro de um <label>
    event.preventDefault();
    event.stopPropagation();
    if (isTauri) void openUrl(href);
    else window.open(href, "_blank", "noopener");
  }

  return (
    <a className={`external-link ${className ?? ""}`} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
