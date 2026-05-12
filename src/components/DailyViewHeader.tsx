import { ChevronLeft, ChevronRight } from '../lib/icons';
import { getEstDateString } from '../lib/timezone';
import { useUserPreferences } from '../lib/userPreferences';

interface DailyViewHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
}

export default function DailyViewHeader({
                                          date,
                                          onDateChange,
                                        }: DailyViewHeaderProps) {
  useUserPreferences();
  const dateObj = new Date(date + 'T00:00:00');

  const todayObj = new Date(getEstDateString() + 'T00:00:00');
  todayObj.setHours(0, 0, 0, 0);

  const currentDateObj = new Date(date + 'T00:00:00');

  const diff = Math.floor(
      (currentDateObj.getTime() - todayObj.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const isToday = diff === 0;

  const dateStr = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const dateStrWithCapitalizedDay =
      dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const getDayLabel = () => {
    if (diff === 0) return "Aujourd'hui";
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
      <div
          className="border-2 border-ink-black bg-ink-red p-6"
          style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <button
              onClick={handlePrevDay}
              className="retro-btn p-3 text-ink-black bg-paper"
              title="Jour précédent"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center flex-1 min-w-0">
            <h2 className="font-display text-sm uppercase text-paper opacity-90 leading-none">
              {getDayLabel()}
            </h2>

            <p className="text-lg text-paper mt-2 font-bold">
              {dateStrWithCapitalizedDay}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
                onClick={handleToday}
                className={`retro-btn bg-paper text-ink-black px-4 py-3 text-sm uppercase ${
                    isToday ? 'invisible pointer-events-none' : ''
                }`}
                title="Revenir à aujourd\'hui"
                aria-hidden={isToday}
                tabIndex={isToday ? -1 : 0}
            >
              Revenir à aujourd\'hui
            </button>

            <button
                onClick={handleNextDay}
                className="retro-btn p-3 text-ink-black bg-paper"
                title="Jour suivant"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
  );
}