import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check, X } from 'lucide-react';
import { Task, TaskPriority, Goal } from '../types';
import { getGoalColor } from '../lib/goalColors';
import { isRecurrenceMatch } from '../lib/recurrence';

interface Props {
  tasks: Task[];
  goals: Goal[];
  onEditTask: (task: Task) => void;
  onNewTask: (date: string) => void;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-ink-green text-paper',
  medium: 'bg-ink-blue text-paper',
  high: 'bg-ink-orange text-ink-black',
  urgent: 'bg-ink-red text-paper',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  urgent: 'Urgent',
};

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const MAX_VISIBLE = 2;

interface DayData {
  dueTasks: Task[];
}

interface DayModalProps {
  date: string;
  label: string;
  data: DayData;
  goals: Goal[];
  isPast: boolean;
  onEditTask: (task: Task) => void;
  onClose: () => void;
}

function DayModal({ date: _date, label, data, goals, isPast, onEditTask, onClose }: DayModalProps) {
  const total = data.dueTasks.length;

  return (
    <div className="fixed inset-0 bg-ink-black/70 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md bg-paper border-2 border-ink-black flex flex-col"
        style={{ boxShadow: '6px 6px 0 #1a1a1a', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink-black bg-ink-blue text-paper shrink-0">
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-[9px] uppercase opacity-70 tracking-widest">Jour</p>
              <h2 className="font-display text-sm uppercase leading-tight">{label}</h2>
            </div>
          </div>
          <button onClick={onClose} className="hover:opacity-60 transition-opacity p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-paper/50" style={{ scrollbarWidth: 'none' }}>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 opacity-40">
              <span className="font-mono text-xs uppercase">Aucune tâche</span>
            </div>
          ) : (
            data.dueTasks.map(task => {
              const goalColor = getGoalColor(task.goal_id, goals.find(g => g.id === task.goal_id)?.color);
              const isOverdue = isPast && task.status !== 'done';
              return (
                <button
                  key={task.id}
                  onClick={() => { onEditTask(task); onClose(); }}
                  className="flex items-start gap-2 p-3 border-2 border-ink-black text-left w-full transition-all hover:translate-x-0.5"
                  style={{
                    backgroundColor: goalColor.bg,
                    color: goalColor.fg,
                    boxShadow: '2px 2px 0 #1a1a1a',
                  }}
                >
                  <div className="shrink-0 pt-0.5">
                    {task.status === 'done' ? (
                      <div className="w-5 h-5 flex items-center justify-center bg-ink-black text-paper border border-ink-black rounded">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className={`w-5 h-5 flex items-center justify-center border-2 border-ink-black rounded text-[10px] font-black ${PRIORITY_STYLES[task.priority]}`}>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display text-sm font-bold leading-tight ${task.status === 'done' ? 'line-through opacity-70' : ''}`}>
                      {task.title}
                    </p>
                  </div>
                  {isOverdue && (
                    <span className="text-[9px] font-mono font-bold uppercase text-ink-red shrink-0 whitespace-nowrap">En retard</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t-2 border-ink-black flex items-center justify-between shrink-0">
          <p className="font-mono text-[9px] uppercase opacity-50 font-bold">
            {total} tâche{total !== 1 ? 's' : ''}
          </p>
          <button onClick={onClose} className="retro-btn text-xs bg-paper">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ tasks, goals, onEditTask, onNewTask }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dayModal, setDayModal] = useState<{ day: number } | null>(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function isToday(day: number) {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  }

  function isPast(day: number) {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getDayData(day: number): DayData {
    const ds = dateStr(day);

    const dueTasks = tasks.filter(t => {
      // Direct match
      if (t.due_date === ds) return true;
      if (!t.due_date && t.start_date === ds) return true;
      // Recurring match — use JSONB rule when available, else fallback to legacy columns
      if (!t.due_date) return false;
      const origin = new Date(t.due_date + 'T00:00:00');
      const target = new Date(ds + 'T00:00:00');
      if (t.recurrence) return isRecurrenceMatch(origin, t.recurrence, target);
      if (t.recurrence_type === 'none' || !t.recurrence_interval) return false;
      if (target <= origin) return false;
      if (t.recurrence_end_date && target > new Date(t.recurrence_end_date + 'T00:00:00')) return false;
      const diffDays = Math.round((target.getTime() - origin.getTime()) / 86400000);
      return diffDays % t.recurrence_interval === 0;
    });

    return { dueTasks };
  }

  return (
    <>
      <div className="border-2 border-ink-black bg-ink-red px-4 py-3 shrink-0 mr-[3px]" style={{ boxShadow: '3px 3px 0 #1a1a1a' }}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center w-full">
          <button onClick={prevMonth} className="retro-btn bg-paper p-2 justify-self-start"><ChevronLeft size={18} /></button>
          <h3 className="font-display text-xl uppercase font-bold text-ink-black text-center">{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className="retro-btn bg-paper p-2 justify-self-end"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="border-2 border-ink-black flex-1 min-h-0 overflow-hidden flex flex-col mr-[3px]" style={{ boxShadow: '3px 3px 0 #1a1a1a' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 shrink-0 border-b-2 border-ink-black">
          {DAY_NAMES.map((d, idx) => {
            const isWeekend = idx === 0 || idx === 6;
            const headerBg = isWeekend ? 'bg-ink-red text-paper' : 'bg-ink-black text-paper';
            return (
              <div key={d} className={`px-3 py-3 text-center ${headerBg} ${idx === 6 ? '' : 'border-r-2 border-ink-black'}`}>
                <span className="font-display text-sm uppercase font-bold tracking-wide">{d}</span>
              </div>
            );
          })}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7 flex-1 min-h-0 overflow-auto" style={{ scrollbarWidth: 'none' }}>
          {cells.map((day, i) => {
            const data = day ? getDayData(day) : null;
            const today_ = day ? isToday(day) : false;
            const past = day ? isPast(day) : false;
            const total = data ? data.dueTasks.length : 0;
            const overflow = Math.max(0, total - MAX_VISIBLE);
            const isLastCol = (i + 1) % 7 === 0;
            const colIdx = i % 7;
            const isWeekend = colIdx === 0 || colIdx === 6;

            const cellBg = !day
              ? 'bg-ink-black/5'
              : today_
                ? 'bg-ink-yellow'
                : past
                  ? 'bg-paper/50'
                  : isWeekend
                    ? 'bg-ink-teal/10 hover:bg-ink-teal/20'
                    : 'bg-paper hover:bg-ink-yellow/15';

            return (
              <div
                key={i}
                className={`border-r-2 border-b-2 border-ink-black flex flex-col transition-colors ${cellBg} ${day ? 'cursor-pointer' : ''} p-2 ${isLastCol ? 'border-r-0' : ''}`}
                onClick={() => day && onNewTask(dateStr(day))}
                style={{ minHeight: '5.5rem' }}
              >
                {day && data && (
                  <>
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-display text-base font-bold leading-none ${
                        today_
                          ? 'text-ink-red'
                          : isWeekend
                            ? 'text-ink-teal'
                            : 'text-ink-black'
                      }`}>
                        {day}
                      </span>
                      {total > 0 && (
                        <span className={`text-[10px] font-mono font-bold border border-ink-black px-1.5 py-0.5 ${
                          total >= 5 ? 'bg-ink-red text-paper' :
                          total >= 3 ? 'bg-ink-orange text-ink-black' :
                          'bg-ink-black text-paper'
                        }`}>{total}</span>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                      {data.dueTasks.slice(0, MAX_VISIBLE).map(task => {
                        const goalColor = getGoalColor(task.goal_id, goals.find(g => g.id === task.goal_id)?.color);
                        return (
                          <button
                            key={task.id}
                            onClick={e => { e.stopPropagation(); onEditTask(task); }}
                            className="flex items-center gap-1.5 px-2 py-1 border-2 border-ink-black text-left w-full text-[11px] font-display font-bold transition-all hover:translate-x-0.5"
                            style={{
                              backgroundColor: goalColor.bg,
                              color: goalColor.fg,
                              boxShadow: '1px 1px 0 #1a1a1a',
                              opacity: task.status === 'done' ? 0.6 : 1,
                            }}
                            title={task.title}
                          >
                            <span className={`shrink-0 w-4 h-4 flex items-center justify-center border-[2px] border-ink-black font-bold text-[8px] ${
                              task.status === 'done'
                                ? 'bg-ink-black text-paper'
                                : PRIORITY_STYLES[task.priority]
                            }`}>
                              {task.status === 'done' ? <Check size={8} strokeWidth={3} /> : null}
                            </span>
                            <span className={`truncate ${task.status === 'done' ? 'line-through' : ''}`}>
                              {task.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Overflow indicator */}
                    {overflow > 0 && (
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="text-[9px] font-mono font-bold text-ink-black/40">+{overflow}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setDayModal({ day }); }}
                          className="text-[9px] font-mono font-bold text-ink-red hover:text-ink-black transition-colors uppercase"
                        >
                          Plus
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-2 border-ink-black bg-paper p-3 flex items-center gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm uppercase">Priorités :</span>
        </div>
        {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 border-2 border-ink-black ${PRIORITY_STYLES[p]}`} />
            <span className="font-mono text-sm opacity-80">{PRIORITY_LABELS[p]}</span>
          </div>
        ))}
      </div>

      {/* Day detail modal */}
      {dayModal && (() => {
        const d = dayModal.day;
        const data = getDayData(d);
        const past = isPast(d);
        const ds = dateStr(d);
        const label = `${DAY_NAMES[new Date(year, month, d).getDay()]} ${d} ${MONTHS[month]} ${year}`;
        return (
          <DayModal
            date={ds}
            label={label}
            data={data}
            goals={goals}
            isPast={past}
            onEditTask={onEditTask}
            onClose={() => setDayModal(null)}
          />
        );
      })()}
    </>
  );
}

export default CalendarView;
