import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from '../lib/icons';

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
}

export default function LocationInput({ value, onChange, suggestions }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );

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

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          id="location-input"
          name="location"
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            if (e.target.value) setOpen(true);
          }}
          onFocus={() => value && setOpen(true)}
          className="retro-input w-full"
          placeholder="Entrer un emplacement..."
          autoComplete="off"
        />
        {filtered.length > 0 && (
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
          />
        )}
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute z-[200] top-full left-0 right-0 mt-2 bg-paper border-2 border-ink-black overflow-y-auto"
          style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', maxHeight: '200px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filtered.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3 py-2.5 font-mono text-xs transition-colors duration-75 border-b last:border-b-0 hover:bg-ink-black/8"
              style={{ borderColor: 'color-mix(in srgb, var(--theme-primary-text) 70%, transparent)' }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
