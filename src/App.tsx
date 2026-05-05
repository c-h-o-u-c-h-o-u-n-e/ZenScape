
import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown } from './lib/icons';
import { supabase } from './lib/supabase';
import { getEstDate } from './lib/timezone';
import { getNextRecurrenceDate } from './lib/recurrence';
import { Goal, Task, Filters, TaskStatus } from './types';

const DEFAULT_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
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

  const [filters, setFilters] = useState<Filters>({ goalId: null, goalIds: [], search: '', status: null, priority: null, tags: null, dateFrom: null, dateTo: null });

  const [goalModal, setGoalModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null; defaultStatus?: TaskStatus; defaultDate?: string; defaultGoalId?: string | null }>({ open: false, task: null });
  const [archivesModal, setArchivesModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [profileModal, setProfileModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ open: false });
  const [filtersToastExpanded, setFiltersToastExpanded] = useState(false);

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
    await supabase.from('tasks').update({ archived, updated_at: getEstDate().toISOString() }).eq('id', taskId);
    fetchTasks();
  }

  async function handleChangeTaskStatus(taskId: string, status: TaskStatus) {
    const task = tasks.find(t => t.id === taskId);

    await supabase.from('tasks').update({ status, updated_at: getEstDate().toISOString() }).eq('id', taskId);

    // Centralized recurrence behavior:
    // whenever a recurring task is transitioned to "done",
    // create its next occurrence automatically.
    if (task && status === 'done' && task.status !== 'done' && task.recurrence) {
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

    fetchTasks();
  }

  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.search.trim()) {
    activeFilterChips.push({
      key: 'search',
      label: `Recherche: ${filters.search.trim()}`,
      onRemove: () => setFilters({ ...filters, search: '' }),
    });
  }

  if (filters.status) {
    const statusLabel = columnLabels[filters.status] ?? filters.status;
    activeFilterChips.push({
      key: `status-${filters.status}`,
      label: `Statut: ${statusLabel}`,
      onRemove: () => setFilters({ ...filters, status: null }),
    });
  }

  if (filters.priority?.length) {
    const priorityLabels: Record<string, string> = {
      low: 'Faible',
      medium: 'Moyen',
      high: 'Élevé',
      urgent: 'Urgent',
    };
    for (const p of filters.priority) {
      activeFilterChips.push({
        key: `priority-${p}`,
        label: `Priorité ${priorityLabels[p] ?? p}`,
        onRemove: () => setFilters({ ...filters, priority: (filters.priority ?? []).filter(x => x !== p) || null }),
      });
    }
  }

  if (filters.goalIds?.length) {
    for (const goalId of filters.goalIds) {
      const goalName = goals.find(g => g.id === goalId)?.title ?? 'Projet';
      activeFilterChips.push({
        key: `goal-${goalId}`,
        label: goalName,
        onRemove: () => setFilters({ ...filters, goalIds: (filters.goalIds ?? []).filter(id => id !== goalId) }),
      });
    }
  }

  if (filters.tags?.length) {
    for (const tag of filters.tags) {
      activeFilterChips.push({
        key: `tag-${tag}`,
        label: tag,
        onRemove: () => setFilters({ ...filters, tags: (filters.tags ?? []).filter(t => t !== tag) }),
      });
    }
  }

  if (filters.dateFrom) {
    activeFilterChips.push({
      key: 'date-from',
      label: `Du: ${filters.dateFrom}`,
      onRemove: () => setFilters({ ...filters, dateFrom: null }),
    });
  }

  if (filters.dateTo) {
    activeFilterChips.push({
      key: 'date-to',
      label: `Au: ${filters.dateTo}`,
      onRemove: () => setFilters({ ...filters, dateTo: null }),
    });
  }

  function getFilterChipClass(key: string): string {
    if (key.startsWith('priority-')) return 'bg-ink-green text-paper';
    if (key.startsWith('goal-')) return 'bg-ink-red text-paper';
    if (key.startsWith('tag-')) return 'bg-ink-blue text-paper';
    return 'bg-paper text-ink-black';
  }

  useEffect(() => {
    if (activeFilterChips.length === 0) setFiltersToastExpanded(false);
  }, [activeFilterChips.length]);

  const filteredTasks = tasks.filter(task => {
    if (task.archived) return false;
    if (filters.goalIds && filters.goalIds.length > 0 && !filters.goalIds.includes(task.goal_id)) return false;
    if (filters.search.trim()) {
      const search = filters.search.trim().toLowerCase();
      const inTitle = task.title.toLowerCase().includes(search);
      const inLocation = task.location?.toLowerCase().includes(search) ?? false;
      const inTags = task.tags.some(tag => tag.toLowerCase().includes(search));
      if (!inTitle && !inLocation && !inTags) return false;
    }
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && !filters.priority.includes(task.priority)) return false;
    if (filters.tags && !filters.tags.some(tag => task.tags.includes(tag))) return false;
    if (filters.dateFrom && task.due_date) {
      const taskDate = task.due_date.split('T')[0];
      if (taskDate < filters.dateFrom) return false;
    }
    if (filters.dateTo && task.due_date) {
      const taskDate = task.due_date.split('T')[0];
      if (taskDate > filters.dateTo) return false;
    }
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
      <AnimatePresence>
        {activeFilterChips.length > 0 && (
          <motion.div
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-[min(980px,calc(100vw-2rem))]"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="border-l-2 border-r-2 border-b-2 border-ink-black bg-ink-yellow px-4 py-2" style={{ boxShadow: '4px 0 0 #1a1a1a, 4px 4px 0 #1a1a1a' }}>
              <div className="flex items-center gap-3">
                <p className="font-display text-xs text-ink-black flex-1">
                  Des filtres ou étiquettes actifs masquent certaines tâches.
                </p>
                <button
                  onClick={() => setFiltersToastExpanded(v => !v)}
                  className="retro-btn h-[28px] w-[28px] p-0 inline-flex items-center justify-center bg-paper text-ink-black"
                  title={filtersToastExpanded ? 'Réduire les filtres actifs' : 'Afficher les filtres actifs'}
                >
                  <motion.div
                    animate={{ rotate: filtersToastExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </button>
              </div>

              <AnimatePresence>
                {filtersToastExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-3 border-t-2 border-ink-black/70">
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-black">Légende :</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-ink-black bg-ink-green text-paper" style={{ boxShadow: '2px 2px 0 #1a1a1a' }}>
                          Priorité
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-ink-black bg-ink-red text-paper" style={{ boxShadow: '2px 2px 0 #1a1a1a' }}>
                          Projet
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-ink-black bg-ink-blue text-paper" style={{ boxShadow: '2px 2px 0 #1a1a1a' }}>
                          Tag
                        </span>
                      </div>

                      <motion.div className="flex flex-wrap gap-2" layout>
                        {activeFilterChips.map((chip, index) => (
                          <motion.button
                            key={chip.key}
                            onClick={chip.onRemove}
                            className={`retro-btn h-[30px] px-2.5 py-0 text-xs font-bold inline-flex items-center gap-2 ${getFilterChipClass(chip.key)}`}
                            title="Retirer ce filtre"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span>{chip.label}</span>
                            <X size={12} />
                          </motion.button>
                        ))}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            className={`retro-btn flex items-center gap-2 text-sm ${view === 'daily' ? 'bg-ink-red text-paper' : 'bg-ink-black/15'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`retro-btn flex items-center gap-2 text-sm ${view === 'kanban' ? 'bg-ink-red text-paper' : 'bg-ink-black/15'}`}
          >
            Tableau
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`retro-btn flex items-center gap-2 text-sm ${view === 'calendar' ? 'bg-ink-red text-paper' : 'bg-ink-black/15'}`}
          >
            Calendrier
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <FilterBar filters={filters} goals={goals} tasks={tasks} columnLabels={columnLabels} onChange={setFilters} />
        </div>

        <div className="search-field relative w-full max-w-[320px] min-w-[220px] shrink-0">
          <Search size={14} className="search-icon absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            placeholder="Rechercher une tâche..."
            className="search-input h-[36px] w-full pl-9 pr-3 py-0 text-sm border-2 border-ink-black bg-ink-black/15 placeholder:text-ink-black/70 focus:outline-none"
            style={{ boxShadow: '2px 2px 0 #1a1a1a' }}
          />
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
            selectedGoalIds={filters.goalIds ?? []}
            onToggleGoalFilter={(goalId) => {
              const current = filters.goalIds ?? [];
              const next = current.includes(goalId)
                ? current.filter(id => id !== goalId)
                : [...current, goalId];
              setFilters({ ...filters, goalIds: next });
            }}
            onNewGoal={() => setGoalModal({ open: true, goal: null })}
            onCreateTaskForGoal={(goalId) => setTaskModal({ open: true, task: null, defaultGoalId: goalId, defaultStatus: 'todo' })}
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
              onChangeTaskStatus={handleChangeTaskStatus}
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
              tasks={filteredTasks}
              allTasks={tasks}
              goals={goals}
              onEditTask={task => setTaskModal({ open: true, task })}
              onNewTask={date => setTaskModal({ open: true, task: null, defaultDate: date })}
              onChangeTaskStatus={handleChangeTaskStatus}
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
          onEdit={(task) => {
            setArchivesModal({ open: false, goal: null });
            setTaskModal({ open: true, task });
          }}
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
