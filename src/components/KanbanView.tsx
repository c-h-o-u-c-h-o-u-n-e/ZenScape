import { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus, Goal } from '../types';
import TaskCard from './TaskCard';
import { supabase } from '../lib/supabase';
import { getGoalColor } from '../lib/goalColors';
import { getNextRecurrenceDate } from '../lib/recurrence';

interface Props {
  tasks: Task[];
  goals: Goal[];
  columnLabels: Record<TaskStatus, string>;
  onLabelsChange: (labels: Record<TaskStatus, string>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string, archived: boolean) => void;
  onNewTask: (status: TaskStatus) => void;
  onDropGoal: (goalId: string, status: TaskStatus) => void;
  onRefresh: () => void;
}

const COLUMNS: { status: TaskStatus; color: string; textColor: string }[] = [
  { status: 'todo', color: 'bg-ink-orange', textColor: 'text-black' },
  { status: 'in_progress', color: 'bg-ink-blue', textColor: 'text-paper' },
  { status: 'done', color: 'bg-ink-green', textColor: 'text-paper' },
];

export default function KanbanView({ tasks, goals, columnLabels, onLabelsChange, onEditTask, onDeleteTask, onArchiveTask, onNewTask, onDropGoal, onRefresh }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<TaskStatus | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function onDragStart(e: React.DragEvent, taskId: string) {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  }

  function onDragLeave() {
    setDragOverCol(null);
  }

  async function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setDragOverCol(null);

    const goalId = e.dataTransfer.getData('application/goal-id');
    if (goalId) {
      onDropGoal(goalId, status);
      return;
    }

    if (!draggedId) return;
    const task = tasks.find(t => t.id === draggedId);
    if (!task || task.status === status) { setDraggedId(null); return; }

    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', draggedId);

    if (status === 'done' && task.recurrence) {
      const baseDate = task.due_date || task.start_date;
      if (baseDate) {
        const nextDate = getNextRecurrenceDate(baseDate, task.recurrence);
        if (nextDate) {
          const newTask: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
            goal_id: task.goal_id,
            user_id: task.user_id,
            title: task.title,
            location: task.location,
            status: 'todo',
            priority: task.priority,
            tags: task.tags,
            start_date: task.start_date ? nextDate : null,
            due_date: task.due_date ? nextDate : null,
            start_time: task.start_time,
            end_time: task.end_time,
            position: Date.now(),
            archived: false,
            recurrence_type: task.recurrence_type,
            recurrence_interval: task.recurrence_interval,
            recurrence_end_date: task.recurrence_end_date,
            recurrence: task.recurrence,
          };
          await supabase.from('tasks').insert([newTask]);
        }
      }
    }

    setDraggedId(null);
    onRefresh();
  }

  function onDragEnd() {
    setDraggedId(null);
    setDragOverCol(null);
  }

  function startEdit(status: TaskStatus) {
    setDraft(columnLabels[status]);
    setEditing(status);
  }

  async function commitEdit() {
    if (!editing) return;
    const status = editing;
    const value = draft.trim() || columnLabels[status];
    onLabelsChange({ ...columnLabels, [status]: value });
    setEditing(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('kanban_column_labels').upsert({
      user_id: user.id,
      status,
      label: value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,status' });
  }

  function cancelEdit() {
    setEditing(null);
  }

  const activeTasks = tasks.filter(t => !t.archived);

  function sortTasks(colTasks: Task[], status: TaskStatus): Task[] {
    if (status === 'todo') {
      return colTasks.sort((a, b) => {
        // Sort by start_date ascending (soonest first)
        if (a.start_date && b.start_date) {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }
        if (a.start_date) return -1;
        if (b.start_date) return 1;
        return 0;
      });
    }

    if (status === 'in_progress') {
      return colTasks.sort((a, b) => {
        // First, sort by due_date (soonest first)
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        // For tasks without due_date, sort by created_at descending (most recently started first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    if (status === 'done') {
      return colTasks.sort((a, b) => {
        // Sort by updated_at descending (most recently completed first)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    }

    return colTasks;
  }

  return (
    <div className="grid grid-cols-3 gap-5 flex-1 min-h-0" style={{ gridTemplateRows: 'minmax(0, 1fr)' }}>
      {COLUMNS.map(col => {
        const colTasks = sortTasks(activeTasks.filter(t => t.status === col.status), col.status);
        const isOver = dragOverCol === col.status;
        const label = columnLabels[col.status];
        const isDoneCol = col.status === 'done';

        return (
          <div
            key={col.status}
            className={`flex flex-col border-2 border-ink-black transition-colors duration-100 ${isOver ? 'drag-over' : ''}`}
            style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
            onDragOver={e => onDragOver(e, col.status)}
            onDragLeave={onDragLeave}
            onDrop={e => onDrop(e, col.status)}
            onDragEnd={onDragEnd}
          >
            <div className={`${col.color} ${col.textColor} px-4 py-3 border-b-2 border-ink-black flex items-center justify-between gap-2`}>
              {editing === col.status ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit();
                    else if (e.key === 'Escape') cancelEdit();
                  }}
                  maxLength={40}
                  className="font-display text-base uppercase bg-transparent focus:outline-none flex-1 min-w-0"
                  style={{ boxShadow: '0 2px 0 rgba(255,255,255,0.6)' }}
                />
              ) : (
                <h3
                  className="font-display text-base uppercase cursor-text flex-1 truncate hover:opacity-80 transition-opacity"
                  onClick={() => startEdit(col.status)}
                  title="Cliquer pour renommer"
                >
                  {label}
                </h3>
              )}
              <span className="font-mono text-xs font-bold opacity-80 shrink-0">{colTasks.length}</span>
            </div>

            <div className={`flex-1 p-3 overflow-y-auto scrollbar-hide ${col.color}`} style={{ minHeight: '0', scrollbarWidth: 'none' }}>
              {colTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  goalColor={getGoalColor(task.goal_id, goals.find(g => g.id === task.goal_id)?.color)}
                  goalName={goals.find(g => g.id === task.goal_id)?.title}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onArchive={isDoneCol ? onArchiveTask : undefined}
                  draggable
                  onDragStart={onDragStart}
                />
              ))}

              {colTasks.length === 0 && !isOver && (
                <div className="h-24 border-2 border-dashed border-ink-black/20 flex items-center justify-center">
                  <p className="font-mono text-[10px] opacity-30 uppercase">Déposer ici</p>
                </div>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
