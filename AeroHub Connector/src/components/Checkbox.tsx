import type { ReactNode } from "react";

// Caixa de seleção no estilo do app. A linha toda (caixa + texto) é clicável.
type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
};

export default function Checkbox({ checked, onChange, children, className }: CheckboxProps) {
  return (
    <label className={`checkbox ${className ?? ""}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="checkbox__box" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="checkbox__label">{children}</span>
    </label>
  );
}
