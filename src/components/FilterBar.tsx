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
        <button
          onClick={() => onChange({ ...filters, priority: null })}
          className={`px-3 py-1.5 text-xs font-bold uppercase border-2 border-ink-black transition-all ${
            filters.priority === null
              ? 'bg-ink-blue text-paper'
              : 'bg-paper text-ink-black hover:bg-ink-yellow/20'
          }`}
          style={{
            boxShadow: filters.priority === null ? '2px 2px 0 #1a1a1a' : 'none'
          }}
        >
          Tous
        </button>
        {PRIORITIES.map(p => (
          <button
            key={p}
            onClick={() => onChange({ ...filters, priority: p })}
            className={`px-3 py-1.5 text-xs font-bold uppercase border-2 border-ink-black transition-all ${
              filters.priority === p
                ? 'bg-ink-blue text-paper'
                : 'bg-paper text-ink-black hover:bg-ink-yellow/20'
            }`}
            style={{
              boxShadow: filters.priority === p ? '2px 2px 0 #1a1a1a' : 'none'
            }}
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
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
