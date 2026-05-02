import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from '../lib/icons';

export interface DropdownOption {
  value: string;
  label: string;
  accent?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  accentTrigger?: boolean;
}

export default function Dropdown({ value, onChange, options, placeholder = 'Select...', className = '', accentTrigger = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
  }

  const triggerBg = accentTrigger && selected?.accent ? selected.accent : 'bg-paper';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`retro-input flex items-center justify-between gap-2 cursor-pointer select-none ${triggerBg} w-full`}
        style={{ paddingRight: '10px' }}
      >
        <span className={`truncate font-mono text-xs ${!selected ? 'text-ink-black/40' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute z-[200] top-full left-0 right-0 mt-2 bg-paper border-2 border-ink-black overflow-y-auto"
          style={{ boxShadow: '4px 4px 0 #1a1a1a', maxHeight: '200px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2.5 font-mono text-xs flex items-center justify-between gap-2 transition-colors duration-75 border-b border-ink-black/10 last:border-b-0 ${
                  isSelected
                    ? 'bg-ink-black text-paper'
                    : 'hover:bg-ink-black/8'
                } ${opt.accent && !isSelected ? opt.accent : ''}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={12} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
