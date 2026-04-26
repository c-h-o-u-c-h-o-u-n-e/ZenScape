import { Task, TaskPriority, RecurrenceRule } from '../types';
import { GoalColor } from '../lib/goalColors';

interface Props {
  task: Task;
  goalColor: GoalColor;
  goalName?: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onArchive?: (taskId: string, archived: boolean) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-ink-teal text-paper',
  medium: 'bg-ink-blue text-paper',
  high: 'bg-ink-yellow text-ink-black',
  urgent: 'bg-ink-red text-paper',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'faible',
  medium: 'moyen',
  high: 'élevé',
  urgent: 'urgent',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'jours',
  weekly: 'semaines',
  monthly: 'mois',
  yearly: 'ans',
};

function formatRecurrence(recurrence: RecurrenceRule): string {
  if (!recurrence) return '';
  const freq = FREQUENCY_LABELS[recurrence.freq] || recurrence.freq;
  return `Se répète tous les ${recurrence.interval} ${freq}`;
}

function formatTime(time: string): string {
  if (!time) return '';
  const parts = time.split(':');
  const hour = parseInt(parts[0]);
  return `${hour}h${parts[1]}`;
}

function TaskCard({ task, goalColor, goalName, onEdit, onDelete, onArchive, draggable = false, onDragStart }: Props) {
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date + 'T00:00:00') < new Date();
  const isDone = task.status === 'done';

  return (
    <div
      className={`border-2 border-ink-black p-4 mb-3 relative group transition-all duration-150 ${isDone ? 'opacity-60' : ''}`}
      style={{ boxShadow: '4px 4px 0 #1a1a1a', backgroundColor: goalColor.bg, color: goalColor.fg }}
      draggable={draggable}
      onDragStart={onDragStart ? e => onDragStart(e, task.id) : undefined}
    >
      <div className="absolute top-1 right-1 flex items-center gap-2">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="hover:opacity-70 transition-opacity" title="Modifier">
            <img src="/icons/pen.svg" alt="Modifier" className="w-4 h-4" style={{ filter: `invert(${goalColor.fg === 'white' ? 1 : 0})` }} />
          </button>
          {onArchive && (
            <button
              onClick={() => onArchive(task.id, true)}
              className="hover:opacity-70 transition-opacity"
              title="Archiver"
            >
              <img src="/icons/box-archive.svg" alt="Archiver" className="w-4 h-4" style={{ filter: `invert(${goalColor.fg === 'white' ? 1 : 0})` }} />
            </button>
          )}
          <button onClick={() => onDelete(task.id)} className="hover:opacity-70 transition-opacity" title="Supprimer">
            <img src="/icons/trash-can.svg" alt="Supprimer" className="w-4 h-4" style={{ filter: `invert(${goalColor.fg === 'white' ? 1 : 0})` }} />
          </button>
        </div>
        {draggable && (
          <div className="opacity-30 group-hover:opacity-70 cursor-grab" title="Déplacer">
            <img src="/icons/grip-vertical.svg" alt="Déplacer" className="w-4 h-4" style={{ filter: `invert(${goalColor.fg === 'white' ? 1 : 0})` }} />
          </div>
        )}
      </div>

      <div className="pr-16 space-y-1.5">
        {goalName && (
          <p className="text-[9px] uppercase font-bold opacity-50 tracking-wide truncate">{goalName}</p>
        )}
        <p className={`font-mono font-bold text-sm leading-tight ${isDone ? 'line-through' : ''}`}>{task.title}</p>
        {task.location && (
          <p className="text-[10px] font-mono opacity-75">{task.location}</p>
        )}
        {task.start_date && (
          <p className="text-[10px] font-mono opacity-75">
            {isDone ? 'Complété' : 'Prévu'} le {new Date(task.start_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
            {task.start_time && ` à ${formatTime(task.start_time)}`}
          </p>
        )}
        {task.due_date && (
          <p className={`text-[10px] font-mono ${isOverdue ? 'font-bold text-ink-red' : 'opacity-75'}`}>
            Échéance le {new Date(task.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
            {task.end_time && ` à ${formatTime(task.end_time)}`}
          </p>
        )}
        {task.recurrence && (
          <p className="text-[10px] font-mono opacity-75">{formatRecurrence(task.recurrence)}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
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
              style={{ backgroundColor: 'transparent', color: goalColor.fg, boxShadow: '2px 2px 0 #1a1a1a' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
