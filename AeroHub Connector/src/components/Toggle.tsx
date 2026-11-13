// Interruptor (on/off) reutilizável — instalador e Definições.
// Funciona como uma checkbox: pode ficar dentro de um <label> para a linha toda ser clicável.
type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <span className="toggle">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </span>
  );
}
