import { useState } from 'react';
import { X } from 'lucide-react';
import { Goal, Task, Filters, TaskStatus, TaskPriority } from '../types';

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
  const [tagsSidebarOpen, setTagsSidebarOpen] = useState(false);
  const allTags = [...new Set(tasks.flatMap(t => t.tags))].sort();

  const hasFilters = filters.status || filters.priority || filters.tags;

  function clear() {
    onChange({ goalId: filters.goalId, status: null, priority: null, tags: null, dateFrom: null, dateTo: null });
  }

  return (
    <>
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
          <button
            onClick={() => setTagsSidebarOpen(true)}
            className="px-3 py-1.5 text-xs font-bold uppercase border-2 border-ink-black transition-all hover:opacity-80 shrink-0"
            style={{
              backgroundColor: 'transparent',
              color: '#1a1a1a',
              boxShadow: '2px 2px 0 #1a1a1a',
            }}
          >
            Répertoire des tags
          </button>
        )}

        <button
          onClick={clear}
          className={`flex items-center gap-1 text-xs font-bold text-ink-red hover:opacity-70 transition-opacity uppercase shrink-0 ${!hasFilters ? 'invisible' : ''}`}
        >
          Effacer
        </button>
      </div>

      {tagsSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={() => setTagsSidebarOpen(false)} />
      )}

      <div
        className="fixed right-0 top-0 bottom-0 w-80 bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col overflow-y-auto"
        style={{
          transform: tagsSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: tagsSidebarOpen ? '-8px 0 0 #1a1a1a' : 'none',
          borderLeft: '2px solid #1a1a1a',
        }}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper sticky top-0">
          <h2 className="font-display text-lg uppercase">Filtrer par tags</h2>
        </div>

        <div className="p-5 flex flex-wrap gap-3">
          {allTags.map(tag => {
            const isActive = filters.tags?.includes(tag) ?? false;
            return (
              <button
                key={tag}
                onClick={() => {
                  const currentTags = filters.tags ?? [];
                  const newTags = isActive
                    ? currentTags.filter(t => t !== tag)
                    : [...currentTags, tag];
                  onChange({ ...filters, tags: newTags.length > 0 ? newTags : null });
                }}
                className="px-3 py-1.5 text-xs font-bold uppercase border-2 border-ink-black transition-all"
                style={{
                  backgroundColor: isActive ? '#457b9d' : 'transparent',
                  color: isActive ? '#f4e8d1' : '#1a1a1a',
                  boxShadow: '2px 2px 0 #1a1a1a',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
