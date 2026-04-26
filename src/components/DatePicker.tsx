import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  openAbove?: boolean;
  alignRight?: boolean;
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function parseDate(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(val: string): string {
  const d = parseDate(val);
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function DatePicker({ value, onChange, placeholder = 'Choisir une date', className = '', openAbove = false, alignRight = false }: Props) {
  const today = new Date();
  const selected = parseDate(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function openPicker() {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    setOpen(o => !o);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    onChange(toYMD(viewYear, viewMonth, day));
    setOpen(false);
  }

const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelectedDay = (day: number) =>
    selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === day;

  const isTodayDay = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openPicker}
        className="retro-input bg-paper flex items-center justify-between gap-2 cursor-pointer select-none w-full text-left"
        style={{ paddingRight: '10px' }}
      >
        <span className={`font-mono text-xs truncate ${!value ? 'text-ink-black/40' : ''}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div
          className={`absolute z-[200] bg-paper border-2 border-ink-black p-3 min-w-[240px] ${alignRight ? 'right-0' : 'left-0'} ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 hover:text-ink-red transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="font-display text-xs uppercase tracking-wide">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 hover:text-ink-red transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1 border-b border-ink-black/20 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold uppercase opacity-50 py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isSel = isSelectedDay(day);
              const isTod = isTodayDay(day);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center text-xs font-medium transition-colors duration-75 rounded-full ${
                    isSel
                      ? 'text-ink-red font-bold'
                      : isTod
                      ? 'font-bold hover:text-ink-red border-2 border-ink-black'
                      : 'hover:text-ink-red/70'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-ink-black/20">
            <button
              type="button"
              onClick={() => { onChange(toYMD(today.getFullYear(), today.getMonth(), today.getDate())); setOpen(false); }}
              className="text-xs uppercase font-bold text-ink-blue hover:text-ink-red transition-colors tracking-wide"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`text-xs uppercase font-bold text-ink-black/40 hover:text-ink-red transition-colors tracking-wide ${!value ? 'invisible' : ''}`}
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default DatePicker;