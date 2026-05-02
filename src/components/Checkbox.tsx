import { Check } from '../lib/icons';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  className?: string;
  labelClassName?: string;
}

export default function Checkbox({ checked, onChange, label, id, className = '', labelClassName = '' }: CheckboxProps) {
  const labelSizeClass = labelClassName.includes('text-') ? '' : 'text-xs';

  return (
    <div className={`flex items-center gap-3 cursor-pointer ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => onChange(!checked)}
        className={`w-6 h-6 border-2 border-ink-black flex items-center justify-center transition-all duration-100 flex-shrink-0 active:bg-ink-red ${
          checked ? 'bg-ink-red' : 'bg-paper'
        }`}
        style={{ boxShadow: '2px 2px 0 #1a1a1a' }}
      >
        {checked && <Check size={12} className="text-paper" />}
      </button>
      <label
        htmlFor={id}
        className={`font-bold ${labelSizeClass} uppercase tracking-wide cursor-pointer select-none pt-1.5 ${labelClassName}`}
      >
        {label}
      </label>
    </div>
  );
}
