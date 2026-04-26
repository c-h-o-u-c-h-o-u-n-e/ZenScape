import { Task, Goal } from '../types';
import { getGoalColor } from '../lib/goalColors';
import TaskCard from './TaskCard';
import { ListTodo } from 'lucide-react';

interface PlanningCardProps {
  tasks: Task[];
  goals: Goal[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string, archived: boolean) => void;
}

export default function PlanningCard({
  tasks,
  goals,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
}: PlanningCardProps) {
  // Separate scheduled and unscheduled tasks
  const scheduledTasks = tasks
    .filter(t => t.start_time && t.status === 'todo')
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const unscheduledTasks = tasks
    .filter(t => !t.start_time && t.status === 'todo')
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;

      const goalA = goals.find(g => g.id === a.goal_id);
      const goalB = goals.find(g => g.id === b.goal_id);
      const goalNameA = goalA?.title || '';
      const goalNameB = goalB?.title || '';
      return goalNameA.localeCompare(goalNameB);
    });

  const allTasks = [...scheduledTasks, ...unscheduledTasks];

  return (
    <div
      className="border-2 border-ink-black flex flex-col h-full"
      style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
    >
      {/* Header */}
      <div className="border-b-2 border-ink-black bg-ink-red px-4 py-3 flex items-center gap-2 shrink-0">
        <ListTodo size={20} className="text-paper" />
        <h3 className="font-display text-base uppercase font-bold text-paper">Planification</h3>
        <span className="ml-auto font-mono text-sm font-bold text-paper opacity-80 tabular-nums">
          {allTasks.length}
        </span>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 flex flex-col gap-3 min-h-0 bg-ink-red" style={{ scrollbarWidth: 'none' }}>
        {allTasks.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-paper opacity-50">
            <p className="font-display text-xs uppercase text-center">Aucune tâche</p>
          </div>
        ) : (
          allTasks.map(task => {
            const goal = goals.find(g => g.id === task.goal_id);
            const goalColor = getGoalColor(task.goal_id, goal?.color);
            const timeDisplay = task.start_time ? task.start_time.slice(0, 5).replace(/^0/, '') : null;

            return (
              <div key={task.id} className="flex flex-col gap-1.5">
                {/* Time display for scheduled tasks */}
                {timeDisplay && (
                  <div className="font-mono text-2xl font-bold text-paper opacity-90">
                    {timeDisplay}
                  </div>
                )}

                {/* Task card */}
                <TaskCard
                  task={task}
                  goalColor={goalColor}
                  goalName={goal?.title}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onArchive={onArchiveTask}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
