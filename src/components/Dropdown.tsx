import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from '../lib/icons';

export interface DropdownOption {
  value: string;
  label: string;
  accent?: string;
  rightLabel?: string;
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
    setHighlightedIndex(-1);
  }

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex(o => o.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => {
      menuRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;

    const menu = menuRef.current;
    const highlightedEl = menu?.querySelector<HTMLButtonElement>(`button[data-option-index="${highlightedIndex}"]`);
    highlightedEl?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  function moveHighlight(direction: 'up' | 'down') {
    if (options.length === 0) return;
    setHighlightedIndex(prev => {
      const current = prev < 0 ? 0 : prev;
      if (direction === 'down') return (current + 1) % options.length;
      return (current - 1 + options.length) % options.length;
    });
  }

  const triggerBg = accentTrigger && selected?.accent ? selected.accent : '';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            moveHighlight(e.key === 'ArrowDown' ? 'down' : 'up');
            return;
          }

          if (e.key === 'Enter' && open && highlightedIndex >= 0 && options[highlightedIndex]) {
            e.preventDefault();
            handleSelect(options[highlightedIndex].value);
          }
        }}
        className={`retro-input flex items-center justify-between gap-2 cursor-pointer select-none ${triggerBg} w-full`}
        style={{ paddingRight: '10px' }}
      >
        {selected?.rightLabel ? (
          <span className="flex items-center justify-between gap-3 w-full min-w-0 font-mono text-xs">
            <span className="truncate">{selected.label}</span>
            <span className="shrink-0 opacity-80">{selected.rightLabel}</span>
          </span>
        ) : (
          <span className={`truncate font-mono text-xs ${!selected ? 'text-ink-black/40' : ''}`}>
            {selected ? selected.label : placeholder}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              moveHighlight(e.key === 'ArrowDown' ? 'down' : 'up');
              return;
            }

            if (e.key === 'Enter' && highlightedIndex >= 0 && options[highlightedIndex]) {
              e.preventDefault();
              handleSelect(options[highlightedIndex].value);
              return;
            }

            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              setHighlightedIndex(-1);
            }
          }}
          className="absolute z-[200] top-full left-0 right-0 mt-2 bg-paper border-2 border-ink-black overflow-y-auto"
          style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', maxHeight: '200px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={opt.value}
                type="button"
                data-option-index={idx}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-3 py-2.5 font-mono text-xs flex items-center justify-between gap-2 transition-colors duration-75 border-b last:border-b-0 ${
                  isHighlighted
                    ? 'bg-ink-black/18'
                    : isSelected
                      ? 'bg-ink-black text-paper'
                      : 'hover:bg-ink-black/8'
                } ${opt.accent && !isSelected && !isHighlighted ? opt.accent : ''}`}
                aria-selected={isHighlighted}
                style={{ borderColor: 'color-mix(in srgb, var(--theme-primary-text) 70%, transparent)' }}
              >
                <span className="truncate">{opt.label}</span>
                <span className="shrink-0 inline-flex items-center gap-2">
                  {isSelected && <Check size={12} className="shrink-0" />}
                  {opt.rightLabel && <span className="opacity-80">{opt.rightLabel}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
