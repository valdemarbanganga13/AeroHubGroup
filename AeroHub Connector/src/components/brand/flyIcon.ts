// Faz o ícone do logo "voar" para outra posição/tamanho.
// Anima a posição e o tamanho reais (e não uma escala), para o ícone ficar sempre nítido,
// e grava a posição final no próprio ícone, para nunca voltar ao lugar errado.

export type IconBox = { left: number; top: number; width: number };

export function flyIcon(icon: HTMLElement, to: IconBox, previous: Animation | null): Animation {
  const current = getComputedStyle(icon);
  const from = { left: current.left, top: current.top, width: current.width };
  const target = { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px` };

  // A animação de abertura (já terminada) sai de cena e a posição final fica no ícone
  icon.style.animation = "none";
  Object.assign(icon.style, target);
  previous?.cancel();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return icon.animate([from, target], {
    duration: reduceMotion ? 0 : 750,
    easing: "cubic-bezier(0.65, 0, 0.35, 1)",
  });
}
