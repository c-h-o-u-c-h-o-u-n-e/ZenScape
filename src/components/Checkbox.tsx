import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  className?: string;
}

export default function Checkbox({ checked, onChange, label, id, className = '' }: CheckboxProps) {
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
        {checked && <Check size={16} className="text-paper" />}
      </button>
      <label
        htmlFor={id}
        className="font-bold text-xs uppercase tracking-wide cursor-pointer select-none"
      >
        {label}
      </label>
    </div>
  );
}
