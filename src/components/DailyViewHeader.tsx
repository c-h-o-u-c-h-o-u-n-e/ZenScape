import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getEstDate, getEstDateString } from '../lib/timezone';

interface DailyViewHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
}

export default function DailyViewHeader({ date, onDateChange }: DailyViewHeaderProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const todayObj = new Date(getEstDateString() + 'T00:00:00');
  todayObj.setHours(0, 0, 0, 0);
  const currentDateObj = new Date(date + 'T00:00:00');
  const diff = Math.floor((currentDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
  const isToday = diff === 0;

  const dateStr = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const dateStrWithCapitalizedDay = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const getDayLabel = () => {
    if (diff === 0) return 'Aujourd\'hui';
    if (diff === -1) return 'Hier';
    if (diff === -2) return 'Avant-hier';
    if (diff === 1) return 'Demain';
    if (diff === 2) return 'Après-demain';
    if (diff < 0) return `Il y a ${Math.abs(diff)} jours`;
    return `Dans ${diff} jours`;
  };

  const handlePrevDay = () => {
    const prev = new Date(date + 'T00:00:00');
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(date + 'T00:00:00');
    next.setDate(next.getDate() + 1);
    onDateChange(next.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onDateChange(getEstDateString());
  };

  return (
    <div className="border-2 border-ink-black bg-ink-red p-6" style={{ boxShadow: '4px 4px 0 #1a1a1a' }}>
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrevDay}
          className="retro-btn p-3 text-paper bg-ink-blue"
          title="Jour précédent"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center flex-1">
          <h2 className="font-display text-sm uppercase text-paper leading-none">{getDayLabel()}</h2>
          <p className="text-lg text-paper opacity-90 mt-2 font-bold">{dateStrWithCapitalizedDay}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToday}
            className={`retro-btn bg-ink-blue text-paper px-4 py-3 text-xs font-bold uppercase ${
              isToday ? 'invisible pointer-events-none' : ''
            }`}
            title="Revenir à aujourd'hui"
            aria-hidden={isToday}
            tabIndex={isToday ? -1 : 0}
          >
            Revenir à aujourd'hui
          </button>

          <button
            onClick={handleNextDay}
            className="retro-btn p-3 text-paper bg-ink-blue"
            title="Jour suivant"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
