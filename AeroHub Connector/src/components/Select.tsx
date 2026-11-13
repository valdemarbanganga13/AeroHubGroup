import { useEffect, useRef, useState, type ReactNode } from "react";

// Lista para escolher uma opção (ex.: língua, som). Fecha ao clicar fora ou com Esc.
export type SelectOption<T extends string> = {
  value: T;
  label: string;
  // Imagem à esquerda do nome (ex.: bandeira)
  icon?: ReactNode;
};

type SelectProps<T extends string> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  // Para onde abre a lista: por baixo (padrão) ou por cima (quando está no fundo da janela)
  placement?: "bottom" | "top";
  className?: string;
};

export default function Select<T extends string>({
  value,
  options,
  onChange,
  placement = "bottom",
  className = "",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`select select--${placement} ${open ? "is-open" : ""} ${className}`}>
      <button
        className="select__button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {current.icon}
        <span className="select__name">{current.label}</span>
        <svg className="select__chevron" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul className="select__menu" role="listbox">
        {options.map((option) => (
          <li key={option.value}>
            <button
              className={`select__option ${option.value === value ? "is-selected" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.icon}
              <span className="select__name">{option.label}</span>
              <svg className="select__check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
