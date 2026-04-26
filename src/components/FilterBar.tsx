import { Goal, Task, Filters, TaskStatus, TaskPriority } from '../types';
import Dropdown, { DropdownOption } from './Dropdown';

interface Props {
  filters: Filters;
  goals: Goal[];
  tasks: Task[];
  columnLabels: Record<TaskStatus, string>;
  onChange: (f: Filters) => void;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  urgent: 'Urgent',
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: '#4caf50', text: '#f4e8d1' },
  medium: { bg: '#457b9d', text: '#f4e8d1' },
  high: { bg: '#ff9800', text: '#1a1a1a' },
  urgent: { bg: '#e63946', text: '#f4e8d1' },
};

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function FilterBar({ filters, goals, tasks, columnLabels, onChange }: Props) {
  const allTags = [...new Set(tasks.flatMap(t => t.tags))].sort();

  const hasFilters = filters.status || filters.priority || filters.tag;

  const tagOptions: DropdownOption[] = [
    { value: '', label: 'Tous les tags' },
    ...allTags.map(t => ({ value: t, label: t })),
  ];

  function clear() {
    onChange({ goalId: filters.goalId, status: null, priority: null, tag: null, dateFrom: null, dateTo: null });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span className="text-xs font-bold opacity-70 shrink-0">Priorité :</span>

      <div className="flex items-center gap-2">
        {PRIORITIES.map(p => {
          const colors = PRIORITY_COLORS[p];
          const isActive = filters.priority?.includes(p) ?? false;
          return (
            <button
              key={p}
              onClick={() => {
                const currentPriorities = filters.priority ?? [];
                const newPriorities = isActive
                  ? currentPriorities.filter(pr => pr !== p)
                  : [...currentPriorities, p];
                onChange({ ...filters, priority: newPriorities.length > 0 ? newPriorities : null });
              }}
              className="px-3 py-1.5 text-xs font-bold uppercase border-2 border-ink-black transition-all"
              style={{
                backgroundColor: isActive ? colors.bg : 'transparent',
                color: isActive ? colors.text : '#1a1a1a',
                boxShadow: '2px 2px 0 #1a1a1a',
              }}
            >
              {PRIORITY_LABELS[p]}
            </button>
          );
        })}
      </div>

      {allTags.length > 0 && (
        <div className="w-60">
          <Dropdown
            value={filters.tag ?? ''}
            onChange={v => onChange({ ...filters, tag: v || null })}
            options={tagOptions}
          />
        </div>
      )}

      <button
        onClick={clear}
        className={`flex items-center gap-1 text-xs font-bold text-ink-red hover:opacity-70 transition-opacity uppercase shrink-0 ${!hasFilters ? 'invisible' : ''}`}
      >
        Effacer
      </button>
    </div>
  );
}
