import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Plus, LayoutGrid, Calendar, Clock } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Goal, Task, Filters, TaskStatus } from './types';

const DEFAULT_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Accompli',
};
import Auth from './components/Auth';
import GoalsSidebar from './components/GoalsSidebar';
import GoalModal from './components/GoalModal';
import TaskModal from './components/TaskModal';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import DailyView from './components/DailyView';
import FilterBar from './components/FilterBar';
import ArchivesModal from './components/ArchivesModal';
import UserMenu from './components/UserMenu';
import ProfileModal from './components/ProfileModal';
import ConfirmModal from './components/ConfirmModal';

type ConfirmState = {
  open: true;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
} | { open: false };

type View = 'daily' | 'kanban' | 'calendar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>('kanban');
  const [columnLabels, setColumnLabels] = useState<Record<TaskStatus, string>>(DEFAULT_LABELS);

  const [filters, setFilters] = useState<Filters>({ goalId: null, status: null, priority: null, tag: null, dateFrom: null, dateTo: null });

  const [goalModal, setGoalModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null; defaultStatus?: TaskStatus; defaultDate?: string; defaultGoalId?: string | null }>({ open: false, task: null });
  const [archivesModal, setArchivesModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [profileModal, setProfileModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ open: false });

  function confirm(opts: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) {
    setConfirmModal({
      open: true,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'Confirmer',
      danger: opts.danger ?? false,
      onConfirm: () => { setConfirmModal({ open: false }); opts.onConfirm(); },
    });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLabels = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('kanban_column_labels')
      .select('status, label')
      .eq('user_id', user.id);
    if (data && data.length > 0) {
      setColumnLabels(prev => {
        const next = { ...prev };
        data.forEach((row: { status: string; label: string }) => {
          if (row.label) next[row.status as TaskStatus] = row.label;
        });
        return next;
      });
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setGoals(data as Goal[]);
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true });
    if (data) setTasks(data as Task[]);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchTasks();
      fetchLabels();
    }
  }, [user, fetchGoals, fetchTasks, fetchLabels]);

  function refresh() {
    fetchGoals();
    fetchTasks();
  }

  function handleDeleteGoal(goalId: string) {
    confirm({
      title: 'Supprimer le projet',
      message: 'Cette action supprimera le projet et toutes ses tâches définitivement. Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: async () => {
        await supabase.from('goals').delete().eq('id', goalId);
        refresh();
      },
    });
  }

  function handleArchiveGoal(goalId: string) {
    confirm({
      title: 'Archiver le projet',
      message: 'Le projet sera archivé et n\'apparaîtra plus dans la liste des projets actifs.',
      confirmLabel: 'Archiver',
      danger: false,
      onConfirm: async () => {
        await supabase.from('goals').update({ status: 'archived' }).eq('id', goalId);
        fetchGoals();
      },
    });
  }

  function handleUnarchiveGoal(goalId: string) {
    confirm({
      title: 'Désarchiver le projet',
      message: 'Le projet sera restauré et réapparaîtra dans la liste des projets actifs.',
      confirmLabel: 'Désarchiver',
      danger: false,
      onConfirm: async () => {
        await supabase.from('goals').update({ status: 'active' }).eq('id', goalId);
        fetchGoals();
      },
    });
  }

  function handleDeleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    confirm({
      title: 'Supprimer la tâche',
      message: `Êtes-vous sûr de vouloir supprimer la tâche "${task?.title || ''}"? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: async () => {
        await supabase.from('tasks').delete().eq('id', taskId);
        fetchTasks();
      },
    });
  }

  async function handleArchiveTask(taskId: string, archived: boolean) {
    await supabase.from('tasks').update({ archived, updated_at: new Date().toISOString() }).eq('id', taskId);
    fetchTasks();
  }

  const filteredTasks = tasks.filter(task => {
    if (task.archived) return false;
    if (filters.goalId && task.goal_id !== filters.goalId) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.tag && !task.tags.includes(filters.tag)) return false;
    if (filters.dateFrom && task.due_date && task.due_date < filters.dateFrom) return false;
    if (filters.dateTo && task.due_date && task.due_date > filters.dateTo) return false;
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="font-display text-xl uppercase text-ink-red bleed-anim">Chargement...</p>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <div className="h-screen bg-paper p-5 flex flex-col" style={{ maxWidth: '100vw', overflowX: 'hidden', overflowY: 'hidden' }}>
      {/* HEADER */}
      <header className="flex items-center justify-between border-b-[5px] border-ink-black pb-5 mb-6 flex-shrink-0">
        <div>
          <img
            src="/images/logo.png"
            alt="Goal-O-Matic"
            className="h-24 object-contain"
          />
        </div>

        <div className="flex items-center gap-4">
          <UserMenu user={user} onProfileClick={() => setProfileModal(true)} />
        </div>
      </header>

      {/* VIEW SWITCHER + FILTERS + NEW TASK */}
      <div className="flex items-center mb-5 gap-3 flex-wrap flex-shrink-0">
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setView('daily')}
            className={`retro-btn flex items-center gap-2 text-xs ${view === 'daily' ? 'bg-ink-red text-paper' : 'bg-paper'}`}
          >
            <Clock size={15} /> Aujourd'hui
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`retro-btn flex items-center gap-2 text-xs ${view === 'kanban' ? 'bg-ink-red text-paper' : 'bg-paper'}`}
          >
            <LayoutGrid size={15} /> Tableau
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`retro-btn flex items-center gap-2 text-xs ${view === 'calendar' ? 'bg-ink-red text-paper' : 'bg-paper'}`}
          >
            <Calendar size={15} /> Calendrier
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <FilterBar filters={filters} goals={goals} tasks={tasks} columnLabels={columnLabels} onChange={setFilters} />
        </div>

        <button
          onClick={() => setTaskModal({ open: true, task: null })}
          className="retro-btn bg-ink-red text-paper text-sm flex items-center gap-2 shrink-0"
        >
          Nouvelle tâche
        </button>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex gap-6 flex-1 min-h-0 pb-2">
        {/* SIDEBAR */}
        <div className="w-72 shrink-0 min-h-0 pr-1.5">
          <GoalsSidebar
            goals={goals}
            tasks={tasks}
            onNewGoal={() => setGoalModal({ open: true, goal: null })}
            onEditGoal={goal => setGoalModal({ open: true, goal })}
            onDeleteGoal={handleDeleteGoal}
            onArchiveGoal={handleArchiveGoal}
            onUnarchiveGoal={handleUnarchiveGoal}
            onViewArchives={goal => setArchivesModal({ open: true, goal })}
          />
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col pr-1.5">
          {view === 'daily' ? (
            <DailyView
              tasks={tasks}
              goals={goals}
              onEditTask={task => setTaskModal({ open: true, task })}
              onDeleteTask={handleDeleteTask}
              onArchiveTask={handleArchiveTask}
            />
          ) : view === 'kanban' ? (
            <KanbanView
              tasks={filteredTasks}
              goals={goals}
              columnLabels={columnLabels}
              onLabelsChange={setColumnLabels}
              onEditTask={task => setTaskModal({ open: true, task })}
              onDeleteTask={handleDeleteTask}
              onArchiveTask={handleArchiveTask}
              onNewTask={status => setTaskModal({ open: true, task: null, defaultStatus: status })}
              onDropGoal={async (goalId, status) => {
                const goal = goals.find(g => g.id === goalId);
                if (!goal) return;
                const maxPos = tasks
                  .filter(t => t.status === status)
                  .reduce((m, t) => Math.max(m, t.position), -1);
                await supabase.from('tasks').insert({
                  goal_id: goalId,
                  user_id: user.id,
                  title: goal.title,
                  status,
                  priority: 'medium',
                  tags: [],
                  position: maxPos + 1,
                });
                fetchTasks();
              }}
              onRefresh={fetchTasks}
            />
          ) : (
            <CalendarView
              tasks={tasks}
              goals={goals}
              onEditTask={task => setTaskModal({ open: true, task })}
              onNewTask={date => setTaskModal({ open: true, task: null, defaultDate: date })}
            />
          )}
        </div>
      </div>

      {/* MODALS */}
      {goalModal.open && (
        <GoalModal
          goal={goalModal.goal}
          userId={user.id}
          onClose={() => setGoalModal({ open: false, goal: null })}
          onSaved={fetchGoals}
        />
      )}

      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          goals={goals}
          columnLabels={columnLabels}
          defaultGoalId={taskModal.defaultGoalId ?? null}
          defaultStatus={taskModal.defaultStatus}
          defaultDate={taskModal.defaultDate}
          userId={user.id}
          onClose={() => setTaskModal({ open: false, task: null })}
          onSaved={refresh}
        />
      )}

      {archivesModal.open && archivesModal.goal && (
        <ArchivesModal
          goal={archivesModal.goal}
          archivedTasks={tasks.filter(t => t.goal_id === archivesModal.goal!.id && t.archived)}
          onUnarchive={async (taskId) => {
            await handleArchiveTask(taskId, false);
          }}
          onDelete={async (taskId) => {
            await handleDeleteTask(taskId);
          }}
          onClose={() => setArchivesModal({ open: false, goal: null })}
        />
      )}

      {profileModal && (
        <ProfileModal user={user} onClose={() => setProfileModal(false)} />
      )}

      {confirmModal.open && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ open: false })}
        />
      )}
    </div>
  );
}
