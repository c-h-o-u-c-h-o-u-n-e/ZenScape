import { Goal, Task, Filters, TaskStatus, TaskPriority } from '../types';
import Dropdown, { DropdownOption } from './Dropdown';
import DatePicker from './DatePicker';

interface Props {
  filters: Filters;
  goals: Goal[];
  tasks: Task[];
  columnLabels: Record<TaskStatus, string>;
  onChange: (f: Filters) => void;
}

const PRIORITY_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Toutes les priorités' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'urgent', label: 'Urgent' },
];

export default function FilterBar({ filters, goals, tasks, columnLabels, onChange }: Props) {
  const allTags = [...new Set(tasks.flatMap(t => t.tags))].sort();

  const hasFilters = filters.status || filters.priority || filters.tag || filters.dateFrom || filters.dateTo;

  const tagOptions: DropdownOption[] = [
    { value: '', label: 'Tous les tags' },
    ...allTags.map(t => ({ value: t, label: t })),
  ];

  function clear() {
    onChange({ goalId: filters.goalId, status: null, priority: null, tag: null, dateFrom: null, dateTo: null });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span className="text-xs font-bold opacity-70 shrink-0">Filtrer :</span>

      <div className="w-60">
        <Dropdown
          value={filters.priority ?? ''}
          onChange={v => onChange({ ...filters, priority: (v as TaskPriority) || null })}
          options={PRIORITY_OPTIONS}
        />
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

      <div className="flex items-center gap-12">
        <span className="text-xs font-bold opacity-50 shrink-0"></span>
        <div className="w-[240px]">
          <DatePicker
            value={filters.dateFrom ?? ''}
            onChange={v => onChange({ ...filters, dateFrom: v || null })}
            placeholder="Date de début"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold opacity-50 shrink-0"></span>
        <div className="w-[240px]">
          <DatePicker
            value={filters.dateTo ?? ''}
            onChange={v => onChange({ ...filters, dateTo: v || null })}
            placeholder="Date de fin"
          />
        </div>
      </div>

      <button
        onClick={clear}
        className={`flex items-center gap-1 text-xs font-bold text-ink-red hover:opacity-70 transition-opacity uppercase shrink-0 ${!hasFilters ? 'invisible' : ''}`}
      >
        Effacer
      </button>
    </div>
  );
}
