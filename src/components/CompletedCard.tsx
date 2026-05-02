import { Task, Goal, TaskStatus } from '../types';
import { getGoalColor } from '../lib/goalColors';
import TaskCard from './TaskCard';
import { Check } from '../lib/icons';

interface CompletedCardProps {
  tasks: Task[];
  goals: Goal[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string, archived: boolean) => void;
  onChangeTaskStatus: (taskId: string, status: TaskStatus) => void;
}

export default function CompletedCard({
  tasks,
  goals,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
  onChangeTaskStatus,
}: CompletedCardProps) {
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div
      className="border-2 border-ink-black flex flex-col h-full"
      style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
    >
      {/* Header */}
      <div className="border-b-2 border-ink-black bg-ink-green px-4 py-3 h-[50px] flex items-center gap-2 shrink-0">
        <Check size={16} />
        <h3 className="font-display text-base uppercase text-ink-black">Terminé</h3>
        <span className="ml-auto font-mono text-xs font-bold text-ink-black opacity-80 tabular-nums shrink-0">
          {completedTasks.length}
        </span>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 flex flex-col gap-3 min-h-0 bg-ink-green/60" style={{ scrollbarWidth: 'none' }}>
        {completedTasks.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-ink-black opacity-70">
            <p className="font-display text-sm text-center">Aucune tâche complétée</p>
          </div>
        ) : (
          completedTasks.map(task => {
            const goal = goals.find(g => g.id === task.goal_id);
            const goalColor = getGoalColor(task.goal_id, goal?.color);

            return (
              <TaskCard
                key={task.id}
                task={task}
                goalColor={goalColor}
                goalName={goal?.title}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onArchive={onArchiveTask}
                onChangeStatus={onChangeTaskStatus}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
