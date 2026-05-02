import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { MoreVertical, List, Progress, Check, Drag, Pen, Archive, Trash } from '../lib/icons';
import { Task, TaskPriority, RecurrenceRule, TaskStatus } from '../types';
import { GoalColor } from '../lib/goalColors';
import { createPortal } from 'react-dom';

interface Props {
  task: Task;
  goalColor: GoalColor;
  goalName?: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onArchive?: (taskId: string, archived: boolean) => void;
  onChangeStatus?: (taskId: string, status: TaskStatus) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-ink-green text-paper',
  medium: 'bg-ink-blue text-paper',
  high: 'bg-ink-orange text-ink-black',
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

function lightenHex(hex: string, amount = 60): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Ramener en planification',
  in_progress: 'Marquer comme en cours',
  done: 'Marquer comme terminé',
};

const STATUS_ICONS: Record<TaskStatus, ComponentType<{ size?: number; className?: string }>> = {
  todo: List,
  in_progress: Progress,
  done: Check,
};

function TaskCard({ task, goalColor, goalName, onEdit, onDelete, onArchive, onChangeStatus, draggable = false, onDragStart }: Props) {
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date + 'T00:00:00') < new Date();
  const isDone = task.status === 'done';
  const menuBg = lightenHex(goalColor.bg);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inPortal = menuPortalRef.current?.contains(target);
      if (!inPortal) {
        setMenuOpen(false);
        setMenuPosition(null);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div
      ref={cardRef}
      className={`border-2 border-ink-black p-4 mb-3 relative group transition-all duration-150 ${isDone ? 'opacity-60' : ''}`}
      style={{ boxShadow: '4px 4px 0 #1a1a1a', backgroundColor: goalColor.bg, color: goalColor.fg }}
      draggable={draggable}
      onDragStart={onDragStart ? e => onDragStart(e, task.id) : undefined}
    >
      <div className="absolute top-1 right-1 flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (menuOpen) {
              setMenuOpen(false);
              setMenuPosition(null);
              return;
            }

            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const cardRect = cardRef.current?.getBoundingClientRect();
            const estimatedMenuHeight = onArchive ? 116 : 84;
            const spaceBelowViewport = window.innerHeight - rect.bottom;
            const openUp = spaceBelowViewport < estimatedMenuHeight;

            setMenuPosition({
              top: openUp ? undefined : rect.bottom + 6,
              bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
              right: cardRect ? window.innerWidth - cardRect.right : window.innerWidth - rect.right,
            });
            setMenuOpen(true);
          }}
          className="p-1 rounded transition-colors hover:opacity-80 opacity-0 group-hover:opacity-100"
          style={{ color: goalColor.fg }}
          title="Menu"
        >
          <MoreVertical size={14} />
        </button>
        {draggable && (
          <div className="p-1 rounded transition-colors hover:opacity-80 opacity-0 group-hover:opacity-100 cursor-grab" title="Déplacer">
            <Drag size={14} />
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

      {menuOpen && menuPosition && createPortal(
        <div
          ref={menuPortalRef}
          className="fixed min-w-[150px] border-2 border-ink-black z-[9999]"
          style={{
            boxShadow: '4px 4px 0 #1a1a1a',
            color: '#1a1a1a',
            backgroundColor: menuBg,
            top: menuPosition.top !== undefined ? `${menuPosition.top}px` : 'auto',
            bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : 'auto',
            right: `${menuPosition.right}px`,
          }}
        >
          {onChangeStatus && (['todo', 'in_progress', 'done'] as TaskStatus[])
            .filter(status => status !== task.status)
            .map(status => (
              <button
                key={status}
                onClick={() => {
                  setMenuOpen(false);
                  setMenuPosition(null);
                  onChangeStatus(task.id, status);
                }}
                className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2"
                style={{ backgroundColor: menuBg }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = goalColor.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
              >
                {(() => { const Icon = STATUS_ICONS[status]; return <Icon size={14} />; })()}
                {STATUS_LABELS[status]}
              </button>
            ))}

          <button
            onClick={() => {
              setMenuOpen(false);
              setMenuPosition(null);
              onEdit(task);
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2"
            style={{ backgroundColor: menuBg }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = goalColor.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
          >
            <Pen size={14} />
            Modifier
          </button>

          {onArchive && (
            <button
              onClick={() => {
                setMenuOpen(false);
                setMenuPosition(null);
                onArchive(task.id, true);
              }}
              className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2"
              style={{ backgroundColor: menuBg }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = goalColor.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
            >
              <Archive size={14} />
              Archiver
            </button>
          )}

          <button
            onClick={() => {
              setMenuOpen(false);
              setMenuPosition(null);
              onDelete(task.id);
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2"
            style={{ backgroundColor: menuBg }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = goalColor.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
          >
            <Trash size={14} />
            Supprimer
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

export default TaskCard;
