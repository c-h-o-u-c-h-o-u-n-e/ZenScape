import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, List } from '../lib/icons';
import { Task, Goal, TaskStatus, Medication } from '../types';
import { isRecurrenceMatch } from '../lib/recurrence';
import { getEstDate, getMsUntilNextEstMidnight } from '../lib/timezone';
import { isMedicationDueOnDate } from '../lib/medicationSchedule';
import { supabase } from '../lib/supabase';
import Checkbox from './Checkbox';
import MedicationsDailyCard from './MedicationsDailyCard';
import MedicationModal from './MedicationModal';
import { formatTimeForDisplay, useUserPreferences } from '../lib/userPreferences';

interface Props {
  tasks: Task[];
  allTasks: Task[];
  goals: Goal[];
  onEditTask: (task: Task) => void;
  onNewTask: (date: string) => void;
  onChangeTaskStatus: (taskId: string, status: TaskStatus) => void;
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_NAMES_SUNDAY = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_NAMES_MONDAY = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const PRIORITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  urgent: 'Urgente',
} as const;

const PRIORITY_STYLES = {
  low: '',
  medium: '',
  high: '',
  urgent: '',
} as const;

const PRIORITY_ORDER = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

const PRIORITY_FILTER_ACTIVE_COLORS = {
  low: 'var(--priority-low-bg)',
  medium: 'var(--priority-medium-bg)',
  high: 'var(--priority-high-bg)',
  urgent: 'var(--priority-urgent-bg)',
} as const;

const PRIORITY_DOT_COLORS = {
  low: 'var(--priority-low-bg)',
  medium: 'var(--priority-medium-bg)',
  high: 'var(--priority-high-bg)',
  urgent: 'var(--priority-urgent-bg)',
} as const;

const MIN_CELL_HEIGHT_PX = 56; // Date (40px) + padding haut (8px) + padding bas miroir (8px)
const TASK_LINE_HEIGHT_PX = 14;
const TASK_GAP_PX = 2;
const CELL_CONTENT_EXTRA_PX = 8;
const SEE_MORE_SPACE_PX = 14;

function CalendarView({ tasks, allTasks, goals, onEditTask, onNewTask, onChangeTaskStatus }: Props) {
  const [today, setToday] = useState(getEstDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showCompleted, setShowCompleted] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationStatuses, setMedicationStatuses] = useState<Record<string, 'taken' | 'missed' | null>>({});
  const [medicationModal, setMedicationModal] = useState<{ open: boolean; medication: Medication | null }>({
    open: false,
    medication: null,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [preferences] = useUserPreferences(userId ?? undefined);
  const dayNames = preferences.weekStartsOn === 'monday' ? DAY_NAMES_MONDAY : DAY_NAMES_SUNDAY;

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUser();
  }, [preferences.timezone]);

  useEffect(() => {
    setToday(getEstDate());

    let timeoutId: number;

    const scheduleMidnightRefresh = () => {
      timeoutId = window.setTimeout(() => {
        setToday(getEstDate());
        scheduleMidnightRefresh();
      }, getMsUntilNextEstMidnight());
    };

    scheduleMidnightRefresh();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preferences.timezone]);

  function prevMonth() {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
  }

  function goToCurrentMonth() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }

  const jsFirstDay = new Date(year, month, 1).getDay();
  const firstDay = preferences.weekStartsOn === 'monday' ? (jsFirstDay + 6) % 7 : jsFirstDay;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  useEffect(() => {
    setSelectedDay(prev => Math.min(Math.max(prev, 1), daysInMonth));
  }, [daysInMonth]);

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function toLocalDateKey(dateValue: string): string {
    const d = new Date(dateValue);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  useEffect(() => {
    async function fetchMedications() {
      if (!userId) return;
      const selectedDate = dateStr(selectedDay);
      const { data } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .lte('start_date', selectedDate)
        .or(`end_date.is.null,end_date.gte.${selectedDate}`)
        .order('time_of_day', { ascending: true });

      const dueOnly = data
        ? (data as Medication[]).filter(med => isMedicationDueOnDate(med, selectedDate))
        : [];

      const { data: intakeRows } = await supabase
        .from('medication_intakes')
        .select('medication_id, status')
        .eq('user_id', userId)
        .eq('intake_date', selectedDate);

      const statusMap = (intakeRows ?? []).reduce<Record<string, 'taken' | 'missed' | null>>((acc, row) => {
        acc[row.medication_id] = row.status as 'taken' | 'missed';
        return acc;
      }, {});
      setMedicationStatuses(statusMap);

      const intakeMedicationIds = [...new Set((intakeRows ?? []).map(row => row.medication_id))];
      const missingIds = intakeMedicationIds.filter(id => !dueOnly.some(med => med.id === id));

      let extraFromIntakes: Medication[] = [];
      if (missingIds.length > 0) {
        const { data: medsByIds } = await supabase
          .from('medications')
          .select('*')
          .in('id', missingIds)
          .order('time_of_day', { ascending: true });
        extraFromIntakes = (medsByIds as Medication[] | null) ?? [];
      }

      setMedications([...dueOnly, ...extraFromIntakes]);
    }

    fetchMedications();
  }, [userId, year, month, selectedDay]);

  async function handleDeleteMedication(medicationId: string) {
    await supabase.from('medications').delete().eq('id', medicationId);
    if (!userId) return;
    const selectedDate = dateStr(selectedDay);
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', selectedDate)
      .or(`end_date.is.null,end_date.gte.${selectedDate}`)
      .order('time_of_day', { ascending: true });
    if (data) {
      const dueOnly = (data as Medication[]).filter(med => isMedicationDueOnDate(med, selectedDate));
      setMedications(dueOnly);
    }
  }

  async function handleMarkMedicationTaken(medicationId: string) {
    const selectedDate = dateStr(selectedDay);
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;

    if (userId) {
      await supabase
        .from('medication_intakes')
        .delete()
        .eq('user_id', userId)
        .eq('medication_id', medicationId)
        .eq('intake_date', selectedDate);

      await supabase.from('medication_intakes').insert({
        user_id: userId,
        medication_id: medicationId,
        status: 'taken',
        intake_date: selectedDate,
      });
    }

    setMedicationStatuses(prev => ({
      ...prev,
      [medicationId]: 'taken'
    }));
  }

  async function handleMarkMedicationMissed(medicationId: string) {
    const selectedDate = dateStr(selectedDay);
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;

    if (userId) {
      await supabase
        .from('medication_intakes')
        .delete()
        .eq('user_id', userId)
        .eq('medication_id', medicationId)
        .eq('intake_date', selectedDate);

      await supabase.from('medication_intakes').insert({
        user_id: userId,
        medication_id: medicationId,
        status: 'missed',
        intake_date: selectedDate,
      });
    }

    setMedicationStatuses(prev => ({
      ...prev,
      [medicationId]: 'missed',
    }));
  }

  async function handleClearMedicationTaken(medicationId: string) {
    const selectedDate = dateStr(selectedDay);
    if (userId) {
      await supabase
        .from('medication_intakes')
        .delete()
        .eq('user_id', userId)
        .eq('medication_id', medicationId)
        .eq('intake_date', selectedDate);
    }

    setMedicationStatuses(prev => ({
      ...prev,
      [medicationId]: null,
    }));
  }

  const visibleTasks = useMemo(() => {
    if (showCompleted) return tasks;
    return tasks.filter(t => t.status !== 'done');
  }, [tasks, showCompleted]);

  function getTasksForDay(day: number) {
    const ds = dateStr(day);

    return visibleTasks.filter(t => {
      if (t.due_date === ds) return true;
      if (!t.due_date && t.start_date === ds) return true;
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
  }

  function getCompletedTasksForDay(day: number) {
    const ds = dateStr(day);
    // Les tâches terminées doivent s'afficher uniquement le jour de leur occurrence
    // (due_date / start_date), pas sur les occurrences futures d'une règle récurrente.
    return allTasks
      .filter(task => {
        // Doit être terminée
        if (task.status !== 'done') return false;
        
        // Vérifier si la tâche était planifiée pour ce jour
        if (task.due_date === ds) return true;
        if (!task.due_date && task.start_date === ds) return true;

        // Important: ne pas projeter une tâche terminée via sa récurrence
        // (sinon elle apparaît à des dates où elle n'existe pas réellement).
        return false;
      })
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  function estimateTaskLines(title: string): number {
    const charsPerLine = 22;
    return Math.max(1, Math.ceil(title.length / charsPerLine));
  }

  function isRecurringTask(task: Task): boolean {
    return Boolean(task.recurrence) || task.recurrence_type !== 'none';
  }

  function compareCalendarTasks(a: Task, b: Task): number {
    // 1) Non terminées avant terminées
    const aDone = a.status === 'done';
    const bDone = b.status === 'done';
    if (aDone !== bDone) return aDone ? 1 : -1;

    // 2) Tâches programmées (avec heure) viennent en premier, triées par heure
    const aHasTime = !!a.start_time;
    const bHasTime = !!b.start_time;
    
    if (aHasTime && !bHasTime) return -1;
    if (!aHasTime && bHasTime) return 1;
    
    // Si les deux ont une heure, trier par ordre chronologique
    if (aHasTime && bHasTime) {
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      
      const [hoursA, minutesA] = timeA.split(':').map(Number);
      const [hoursB, minutesB] = timeB.split(':').map(Number);
      const totalMinutesA = (hoursA || 0) * 60 + (minutesA || 0);
      const totalMinutesB = (hoursB || 0) * 60 + (minutesB || 0);
      
      if (totalMinutesA !== totalMinutesB) {
        return totalMinutesA - totalMinutesB;
      }
    }

    // 3) Pour les tâches sans heure, trier par priorité
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // 4) Récurrentes avant non récurrentes
    const aRecurring = isRecurringTask(a);
    const bRecurring = isRecurringTask(b);
    if (aRecurring !== bRecurring) return aRecurring ? -1 : 1;

    // 5) Ordre alphabétique
    return a.title.localeCompare(b.title, 'fr-CA', { sensitivity: 'base' });
  }

  function getFittingPreviewTasks(plannedTasks: Task[], completedTasks: Task[]): Task[] {
    const maxLines = 6;
    const fitting: Task[] = [];
    const sortedTasks = [...plannedTasks, ...completedTasks].sort(compareCalendarTasks);

    let usedLines = 0;

    for (const task of sortedTasks) {
      const lines = estimateTaskLines(task.title);
      if (usedLines + lines > maxLines) break;
      fitting.push(task);
      usedLines += lines;
    }

    return fitting;
  }

  function estimateDayCellHeightPx(day: number): number {
    const dayTodos = getTasksForDay(day).filter(task => task.status !== 'done');
    const dayCompleted = showCompleted ? getCompletedTasksForDay(day) : [];
    const ordered = [...dayTodos, ...dayCompleted].sort(compareCalendarTasks);

    if (ordered.length === 0) return MIN_CELL_HEIGHT_PX;

    const totalLines = ordered.reduce((sum, task) => sum + estimateTaskLines(task.title), 0);
    const totalGaps = Math.max(0, ordered.length - 1) * TASK_GAP_PX;

    return Math.max(
      MIN_CELL_HEIGHT_PX,
      MIN_CELL_HEIGHT_PX + CELL_CONTENT_EXTRA_PX + totalLines * TASK_LINE_HEIGHT_PX + totalGaps + SEE_MORE_SPACE_PX
    );
  }

  const calendarRowTemplate = useMemo(() => {
    const weekCount = Math.max(1, cells.length / 7);
    const weekHeights = Array.from({ length: weekCount }, (_, weekIndex) => {
      const start = weekIndex * 7;
      const weekDays = cells.slice(start, start + 7);
      const maxDayHeight = weekDays.reduce((maxHeight, day) => {
        if (day === null) return maxHeight;
        return Math.max(maxHeight, estimateDayCellHeightPx(day));
      }, MIN_CELL_HEIGHT_PX);

      return maxDayHeight;
    });

    // Chaque ligne garde un minimum strict (encadré date),
    // puis se redistribue selon la charge réelle de contenu.
    return weekHeights
      .map(h => `minmax(${MIN_CELL_HEIGHT_PX}px, ${h}fr)`)
      .join(' ');
  }, [cells, visibleTasks, allTasks, showCompleted, year, month]);

  const selectedTasks = getTasksForDay(selectedDay);
  const selectedTodos = selectedTasks.filter(t => t.status !== 'done');
  const orderedSelectedTodos = [...selectedTodos].sort(compareCalendarTasks);
  
  // Trier les tâches programmées par heure chronologique
  const scheduledSelectedTodos = orderedSelectedTodos
    .filter(task => !!task.start_time)
    .sort((a, b) => {
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      
      // Convertir HH:MM en minutes pour comparaison numérique
      const [hoursA, minutesA] = timeA.split(':').map(Number);
      const [hoursB, minutesB] = timeB.split(':').map(Number);
      const totalMinutesA = (hoursA || 0) * 60 + (minutesA || 0);
      const totalMinutesB = (hoursB || 0) * 60 + (minutesB || 0);
      
      return totalMinutesA - totalMinutesB;
    });
  
  const unscheduledSelectedTodos = orderedSelectedTodos.filter(task => !task.start_time);
  const selectedDone = getCompletedTasksForDay(selectedDay);
  const orderedSelectedDone = [...selectedDone].sort(compareCalendarTasks);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const getMonthLabel = () => {
    const monthDiff = (year - today.getFullYear()) * 12 + (month - today.getMonth());
    if (monthDiff === 0) return 'Mois en cours';

    const absMonths = Math.abs(monthDiff);
    const years = Math.floor(absMonths / 12);
    const months = absMonths % 12;

    const yearLabel = years > 0 ? `${years} an${years > 1 ? 's' : ''}` : '';
    const monthLabel = months > 0 ? `${months} mois` : '';
    const duration = [yearLabel, monthLabel].filter(Boolean).join(' et ');

    if (monthDiff > 0) return `Dans ${duration}`;
    return `Il y a ${duration}`;
  };

  return (
    <div className="h-full min-h-0 flex flex-col pr-1 pb-1">
      <div className="shrink-0 mb-6">
        <div className="border-2 border-ink-black bg-ink-red p-6" style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>
        <div className="flex items-center justify-between gap-4">
          <button onClick={prevMonth} className="retro-btn p-3 text-ink-black bg-paper" title="Mois précédent">
            <ChevronLeft size={24} />
          </button>

          <div className="text-center flex-1">
            <h2 className="font-display text-sm uppercase text-paper opacity-90 leading-none">{getMonthLabel()}</h2>
            <p className="text-lg text-paper mt-2 font-bold">
              {MONTHS[month]} {year}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={goToCurrentMonth}
              className={`retro-btn bg-paper text-ink-black px-4 py-3 text-sm uppercase ${
                isCurrentMonth ? 'invisible pointer-events-none' : ''
              }`}
              title="Revenir à aujourd'hui"
              aria-hidden={isCurrentMonth}
              tabIndex={isCurrentMonth ? -1 : 0}
            >
              Revenir à aujourd'hui
            </button>

            <button onClick={nextMonth} className="retro-btn p-3 text-ink-black bg-paper" title="Mois suivant">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
      </div>

      <div className="shrink-0 mb-6 bg-paper px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          checked={showCompleted}
          onChange={setShowCompleted}
          label="Afficher les tâches terminées"
          id="calendar-show-completed"
          labelClassName="text-sm"
        />
        <div className="flex items-center gap-3 text-sm uppercase font-mono font-bold text-ink-black">
          <span className="opacity-70">Légende priorité :</span>
          {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
            <span key={priority} className="inline-flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full border border-ink-black mr-1"
                style={{ backgroundColor: PRIORITY_FILTER_ACTIVE_COLORS[priority] }}
              />
              {PRIORITY_LABELS[priority]}
            </span>
          ))}
        </div>
      </div>

      <div className="border-2 border-ink-black bg-paper flex flex-col min-h-0 flex-1" style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>
        <div className="min-h-0 flex flex-col flex-1">
            <div className="grid grid-cols-7">
              {dayNames.map((day, i) => {
                return (
                <div
                  key={day}
                  className={`text-center py-3 text-sm uppercase font-mono font-bold tracking-wide text-paper border-b-2 border-b-ink-black ${i !== 6 ? 'border-r-2 border-r-ink-black' : ''} bg-ink-red`}
                >
                  {day}
                </div>
              )})}
            </div>

            <div
              className="grid grid-cols-7 flex-1 overflow-hidden"
              style={{ gridTemplateRows: calendarRowTemplate }}
            >
              {cells.map((day, i) => {
                const isLastRow = i >= cells.length - 7;
                const isLastColumn = (i + 1) % 7 === 0;
                const nextCell = !isLastColumn ? cells[i + 1] : null;
                const isEmptyCell = day === null;
                const removeRightBorderBetweenEmptyCells = isEmptyCell && nextCell === null;
                if (day === null) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className={`${isLastRow ? '' : 'border-b-2'} ${isLastColumn || removeRightBorderBetweenEmptyCells ? '' : 'border-r-2'} border-ink-black bg-[var(--theme-surface)]`}
                    />
                  );
                }

                const dayNumber = day as number;
                const dayTasks = getTasksForDay(dayNumber);
                const dayPlannedTasks = dayTasks.filter(task => task.status !== 'done');
                const dayCompletedTasks = showCompleted
                  ? getCompletedTasksForDay(dayNumber)
                  : [];
                const currentDay = dayNumber;
                const previewTasks = getFittingPreviewTasks(dayPlannedTasks, dayCompletedTasks);
                const cellDate = new Date(year, month, dayNumber);
                const isPast = cellDate < todayStart;
                const isFuture = cellDate > todayStart;
                const isTodayCell = !isPast && !isFuture;

                const dayCellBgStyle = {
                  backgroundColor: isPast
                    ? 'color-mix(in srgb, var(--theme-cta) 60%, transparent)'
                    : isTodayCell
                      ? 'var(--theme-cta)'
                      : 'var(--theme-surface)',
                };

                return (
                  <div
                    key={`day-${dayNumber}`}
                    onClick={() => {
                      setSelectedDay(currentDay);
                      setIsSidebarOpen(true);
                    }}
                    style={dayCellBgStyle}
                    className={`relative ${isLastColumn ? '' : 'border-r-2'} ${isLastRow ? '' : 'border-b-2'} ${isLastRow && !isLastColumn ? "after:content-[''] after:absolute after:right-[-2px] after:bottom-[-2px] after:h-[2px] after:w-[2px] after:bg-ink-black" : ''} border-ink-black p-0 text-left transition-colors cursor-pointer`}
                  >
                    <span
                      className="absolute top-2 left-2 inline-flex h-10 w-10 items-center justify-center border-2 border-ink-black bg-paper text-xl leading-none font-display text-ink-black"
                      style={{ boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}
                    >
                      {day}
                    </span>
                    <div className="absolute left-14 right-2 top-2 bottom-6 overflow-hidden space-y-0.5">
                      {previewTasks.map(task => (
                        <div
                          key={task.id}
                          className={`px-0 py-0 text-[11px] font-display leading-tight whitespace-normal break-words flex items-start gap-1 ${
                            task.status === 'done'
                              ? `${isTodayCell ? 'text-paper' : 'text-ink-black'} line-through opacity-80`
                              : isTodayCell
                                ? 'text-paper'
                                : 'text-ink-black'
                          }`}
                        >
                          <span className={`inline-block h-2 w-2 min-h-2 min-w-2 shrink-0 rounded-full border border-ink-black mt-[2px] mr-1 ${PRIORITY_STYLES[task.priority]}`} style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }} />
                          {task.title}
                        </div>
                      ))}
                    </div>
                    {(dayPlannedTasks.length + dayCompletedTasks.length) > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(currentDay);
                          setIsSidebarOpen(true);
                        }}
                        className={`absolute bottom-1 right-2 text-[9px] underline font-mono font-bold uppercase ${isTodayCell ? 'text-paper' : 'text-ink-black'}`}
                      >
                        Voir plus
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col scrollbar-hide"
        style={{
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '4px solid #1a1a1a',
        }}
        onClick={e => e.stopPropagation()}
      >
            <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper sticky top-0">
              <h2 className="font-display text-lg">
                {(() => {
                  const fullDate = new Date(year, month, selectedDay).toLocaleDateString('fr-CA', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                  return fullDate.charAt(0).toUpperCase() + fullDate.slice(1);
                })()}
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="hover:text-ink-red transition-colors" title="Fermer">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
              <div className="flex-1 min-h-0 flex flex-col gap-5">
              <section className="border-2 border-ink-black flex flex-col min-h-0 flex-1 basis-0" style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', backgroundColor: 'var(--theme-background)' }}>
                <div className="border-b-2 border-ink-black bg-ink-red px-4 py-3 h-[50px] flex items-center gap-2 shrink-0 text-paper">
                  <List size={16} />
                  <h4 className="font-display text-base uppercase text-paper">Planification</h4>
                  <span className="ml-auto font-mono text-sm font-bold text-paper tabular-nums shrink-0">
                    {selectedTodos.length}
                  </span>
                </div>
                <div className="px-4 py-2 space-y-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                  {selectedTodos.length === 0 && (
                    <div className="flex items-center justify-center py-6 text-ink-black opacity-70">
                      <p className="font-display text-sm text-center">Aucune tâche planifiée</p>
                    </div>
                  )}

                  {scheduledSelectedTodos.length > 0 && scheduledSelectedTodos.map(task => {
                    const timeDisplay = formatTimeForDisplay(task.start_time, preferences.timeFormat);
                    return (
                      <div key={task.id} className="py-0 text-ink-black">
                        <button onClick={() => onEditTask(task)} className="w-full text-left pr-1">
                          <div className="flex items-start mt-0.5 gap-2">
                            <span className={`inline-block h-4 w-4 min-h-4 min-w-4 shrink-0 ml-0.5 rounded-full border border-ink-black ${PRIORITY_STYLES[task.priority]}`} style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }} />
                            <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                              <p className="font-display text-sm ml-1 leading-tight whitespace-normal break-words">{task.title}</p>
                              {timeDisplay && (
                                <span className="font-mono text-sm font-bold opacity-90 whitespace-nowrap text-right ml-auto leading-tight">
                                  {timeDisplay}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}

                  {scheduledSelectedTodos.length > 0 && unscheduledSelectedTodos.length > 0 && (
                    <div className="w-full border-t-2 border-ink-black my-2" />
                  )}

                  {unscheduledSelectedTodos.length > 0 && unscheduledSelectedTodos.map(task => {
                    const timeDisplay = formatTimeForDisplay(task.start_time, preferences.timeFormat);
                    return (
                      <div key={task.id} className="py-0 text-ink-black">
                        <button onClick={() => onEditTask(task)} className="w-full text-left pr-1">
                          <div className="flex items-start mt-0.5 gap-2">
                            <span className={`inline-block h-4 w-4 min-h-4 min-w-4 shrink-0 ml-0.5 rounded-full border border-ink-black ${PRIORITY_STYLES[task.priority]}`} style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }} />
                            <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                              <p className="font-display text-sm ml-1 leading-tight whitespace-normal break-words">{task.title}</p>
                              {timeDisplay && (
                                <span className="font-mono text-sm font-bold opacity-90 whitespace-nowrap text-right ml-auto leading-tight">
                                  {timeDisplay}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}

                </div>
                <div className="px-4 pb-3 pt-1 flex justify-end shrink-0" style={{ backgroundColor: 'var(--theme-background)' }}>
                  <button
                    onClick={() => onNewTask(dateStr(selectedDay))}
                    className="retro-btn bg-ink-red text-paper text-sm px-3 py-2 leading-none"
                  >
                    Nouvelle tâche
                  </button>
                </div>
              </section>

              <section className="border-2 border-ink-black flex flex-col min-h-0 flex-1 basis-0" style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', backgroundColor: 'var(--theme-background)' }}>
                <div className="border-b-2 border-ink-black bg-ink-red px-4 py-3 h-[50px] flex items-center gap-2 shrink-0 text-paper">
                  <Check size={16} />
                  <h4 className="font-display text-base uppercase text-paper">Terminé</h4>
                  <span className="ml-auto font-mono text-sm font-bold text-paper tabular-nums shrink-0">
                    {selectedDone.length}
                  </span>
                </div>
                <div className="px-4 py-2 space-y-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                  {selectedDone.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-ink-black opacity-70">
                      <p className="font-display text-sm text-center">Aucune tâche complétée</p>
                    </div>
                  ) : orderedSelectedDone.map(task => {
                    return (
                      <div key={task.id} className="py-0 text-ink-black opacity-75">
                        <button onClick={() => onEditTask(task)} className="w-full text-left pr-1">
                          <div className="flex items-start mt-0.5 gap-2">
                            <span className={`inline-block h-4 w-4 min-h-4 min-w-4 shrink-0 ml-0.5 rounded-full border border-ink-black ${PRIORITY_STYLES[task.priority]}`} style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }} />
                            <p className="font-display text-sm ml-1 leading-tight whitespace-normal break-words line-through">{task.title}</p>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="min-h-0 flex-1 basis-0 flex flex-col">
                <MedicationsDailyCard
                  medications={medications}
                  medicationStatuses={medicationStatuses}
                  onCreateMedication={() => setMedicationModal({ open: true, medication: null })}
                  onEditMedication={med => setMedicationModal({ open: true, medication: med })}
                  onDeleteMedication={handleDeleteMedication}
                  onMarkTaken={handleMarkMedicationTaken}
                  onMarkMissed={handleMarkMedicationMissed}
                  onClearTaken={handleClearMedicationTaken}
                  textOnly
                />
              </div>
              </div>
            </div>
          </aside>

      {medicationModal.open && userId && (
        <MedicationModal
          medication={medicationModal.medication}
          userId={userId}
          onClose={() => setMedicationModal({ open: false, medication: null })}
          onSaved={async () => {
            const selectedDate = dateStr(selectedDay);
            const { data } = await supabase
              .from('medications')
              .select('*')
              .eq('user_id', userId)
              .lte('start_date', selectedDate)
              .or(`end_date.is.null,end_date.gte.${selectedDate}`)
              .order('time_of_day', { ascending: true });
            const dueOnly = data
              ? (data as Medication[]).filter(med => isMedicationDueOnDate(med, selectedDate))
              : [];

            const { data: intakeRows } = await supabase
              .from('medication_intakes')
              .select('medication_id, status')
              .eq('user_id', userId)
              .eq('intake_date', selectedDate);

            const statusMap = (intakeRows ?? []).reduce<Record<string, 'taken' | 'missed' | null>>((acc, row) => {
              acc[row.medication_id] = row.status as 'taken' | 'missed';
              return acc;
            }, {});
            setMedicationStatuses(statusMap);

            const intakeMedicationIds = [...new Set((intakeRows ?? []).map(row => row.medication_id))];
            const missingIds = intakeMedicationIds.filter(id => !dueOnly.some(med => med.id === id));

            let extraFromIntakes: Medication[] = [];
            if (missingIds.length > 0) {
              const { data: medsByIds } = await supabase
                .from('medications')
                .select('*')
                .in('id', missingIds)
                .order('time_of_day', { ascending: true });
              extraFromIntakes = (medsByIds as Medication[] | null) ?? [];
            }

            setMedications([...dueOnly, ...extraFromIntakes]);
          }}
        />
      )}
    </div>
  );
}

export default CalendarView;