import { useState, useRef, useEffect } from 'react';
import { X, ArchiveRestore, Trash2, Archive, CalendarDays, RefreshCw, ChevronDown } from 'lucide-react';
import { Task, Goal, TaskPriority } from '../types';
import { getGoalColor } from '../lib/goalColors';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCalendarDate(task: Task): { date: string; recurring: boolean } | null {
  const recurring = task.recurrence_type !== 'none' && !!task.recurrence_interval;
  if (task.due_date) return { date: task.due_date, recurring };
  if (task.start_date) return { date: task.start_date, recurring };
  return null;
}

interface Props {
  goal: Goal;
  archivedTasks: Task[];
  onUnarchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onClose: () => void;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-ink-teal text-paper',
  medium: 'bg-ink-blue text-paper',
  high: 'bg-ink-yellow text-ink-black',
  urgent: 'bg-ink-red text-paper',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  urgent: 'Urgent',
};


type SortOrder = 'newest' | 'oldest' | 'name';
type TimeRange = 'all' | 'week' | 'month' | 'year';

export default function ArchivesModal({ goal, archivedTasks, onUnarchive, onDelete, onClose }: Props) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const color = getGoalColor(goal.id, goal.color);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen && !timeOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false);
        setTimeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortOpen, timeOpen]);

  const filterByTimeRange = (tasks: Task[]) => {
    const now = new Date();
    return tasks.filter(task => {
      if (timeRange === 'all') return true;

      const updatedDate = new Date(task.updated_at);
      const daysAgo = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (timeRange === 'week') return daysAgo <= 7;
      if (timeRange === 'month') return daysAgo <= 30;
      if (timeRange === 'year') return daysAgo <= 365;

      return true;
    });
  };

  const sortTasks = (tasks: Task[]) => {
    const sorted = [...tasks];
    if (sortOrder === 'newest') {
      return sorted.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA;
      });
    }
    if (sortOrder === 'oldest') {
      return sorted.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateA - dateB;
      });
    }
    if (sortOrder === 'name') {
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  };

  const filteredAndSorted = sortTasks(filterByTimeRange(archivedTasks));

  return (
    <div className="fixed inset-0 bg-ink-black/70 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl bg-paper border-2 border-ink-black flex flex-col"
        style={{ boxShadow: '8px 8px 0 #1a1a1a', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b-4 border-ink-black shrink-0"
          style={{ backgroundColor: color.bg, color: color.fg }}
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase opacity-60 tracking-widest">Archives</p>
              <h2 className="font-display text-lg uppercase leading-tight">{goal.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="hover:opacity-60 transition-opacity p-1">
            <X size={22} />
          </button>
        </div>

        {/* Filters */}
        <div ref={dropdownRef} className="px-5 py-3 border-b-2 border-ink-black/20 flex gap-4 flex-wrap justify-end items-center shrink-0">
          <span className="text-xs font-bold">Affichage :</span>
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setSortOpen(!sortOpen); setTimeOpen(false); }}
              className="bg-paper text-ink-black text-xs font-bold flex items-center justify-between gap-1 border-2 border-ink-black normal-case"
              style={{ boxShadow: '2px 2px 0 #1a1a1a', width: '210px', padding: '6px 12px' }}
            >
              <span>{sortOrder === 'newest' && "Plus récentes d'abord"}
              {sortOrder === 'oldest' && "Plus anciennes d'abord"}
              {sortOrder === 'name' && "Ordre alphabétique"}</span>
              <div className="flex items-center gap-1 shrink-0">
                <ChevronDown size={14} className={`transition-transform duration-150 ${sortOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {sortOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-[210px] border-2 border-ink-black bg-paper z-50"
                style={{ boxShadow: '3px 3px 0 #1a1a1a' }}
              >
                <button
                  onClick={() => { setSortOrder('name'); setSortOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold border-b-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors"
                >
                  Ordre alphabétique
                </button>
                <button
                  onClick={() => { setSortOrder('newest'); setSortOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold border-b-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors"
                >
                  Plus récentes d'abord
                </button>
                <button
                  onClick={() => { setSortOrder('oldest'); setSortOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-ink-black hover:text-paper transition-colors"
                >
                  Plus anciennes d'abord
                </button>
              </div>
            )}
          </div>

          {/* Time Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setTimeOpen(!timeOpen); setSortOpen(false); }}
              className="bg-paper text-ink-black text-xs font-bold flex items-center justify-between gap-1 border-2 border-ink-black normal-case"
              style={{ boxShadow: '2px 2px 0 #1a1a1a', width: '192px', padding: '6px 12px' }}
            >
              <span>{timeRange === 'all' && 'Toutes les archives'}
              {timeRange === 'week' && 'La dernière semaine'}
              {timeRange === 'month' && 'Le dernier mois'}
              {timeRange === 'year' && 'La dernière année'}</span>
              <div className="flex items-center gap-1 shrink-0">
                <ChevronDown size={14} className={`transition-transform duration-150 ${timeOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {timeOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-[192px] border-2 border-ink-black bg-paper z-50"
                style={{ boxShadow: '3px 3px 0 #1a1a1a' }}
              >
                <button
                  onClick={() => { setTimeRange('all'); setTimeOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold border-b-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors"
                >
                  Toutes les archives
                </button>
                <button
                  onClick={() => { setTimeRange('week'); setTimeOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold border-b-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors"
                >
                  La dernière semaine
                </button>
                <button
                  onClick={() => { setTimeRange('month'); setTimeOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold border-b-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors"
                >
                  Le dernier mois
                </button>
                <button
                  onClick={() => { setTimeRange('year'); setTimeOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-ink-black hover:text-paper transition-colors"
                >
                  La dernière année
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
              <Archive size={40} />
              <p className="font-mono text-sm tracking-wide">Aucune tâche archivée pour ce projet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAndSorted.map(task => {
                const calDate = getCalendarDate(task);
                return (
                  <div
                    key={task.id}
                    className="border-2 border-ink-black p-4 flex items-start justify-between gap-4 group"
                    style={{ boxShadow: '3px 3px 0 #1a1a1a', backgroundColor: color.bg, color: color.fg, opacity: 0.75 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm leading-tight">{task.title}</p>
                      {calDate && (
                        <p className="font-mono text-[10px] opacity-70 flex items-center gap-1 mt-1">
                          {calDate.recurring
                            ? <RefreshCw size={10} className="shrink-0" />
                            : <CalendarDays size={10} className="shrink-0" />
                          }
                          Complété le {formatDate(calDate.date)}
                          {calDate.recurring && ' (récurrent)'}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 ${PRIORITY_STYLES[task.priority]}`}
                          style={{ border: '2px solid #1a1a1a', boxShadow: '2px 2px 0 #1a1a1a' }}
                        >
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        {task.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] uppercase px-1.5 py-0.5 border-2 border-ink-black font-mono"
                            style={{ boxShadow: '2px 2px 0 #1a1a1a' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onUnarchive(task.id)}
                        className="retro-btn-press p-2 border-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors"
                        title="Désarchiver"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="retro-btn-press p-2 border-2 border-ink-red text-ink-red hover:bg-ink-red hover:text-paper transition-colors"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t-2 border-ink-black/20 flex items-center justify-between shrink-0">
          <p className="font-mono text-[10px] opacity-70">
            {filteredAndSorted.length} tâche{filteredAndSorted.length !== 1 ? 's' : ''} archivée{filteredAndSorted.length !== 1 ? 's' : ''}
          </p>
          <button onClick={onClose} className="retro-btn text-xs bg-transparent hover:bg-ink-red hover:text-paper transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
