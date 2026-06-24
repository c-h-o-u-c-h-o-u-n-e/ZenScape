
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Search } from './lib/icons';
import { supabase } from './lib/supabase';
import { getEstDate, getMsUntilNextEstMidnight } from './lib/timezone';
import { getNextRecurrenceDate } from './lib/recurrence';
import { Goal, Task, Filters, TaskStatus, Medication, MedicationIntake } from './types';

const DEFAULT_LABELS: Record<TaskStatus, string> = {
  todo: 'Planification',
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
import PreferencesModal from './components/PreferencesModal';
import PrescriptionHistoryModal from './components/PrescriptionHistoryModal';
import AddressBookModal from './components/AddressBookModal';
import ConfirmModal from './components/ConfirmModal';
import ThemeModal from './components/ThemeModal';
import { DEFAULT_THEME, THEME_STORAGE_KEY, ThemeId, applyTheme } from './lib/themes';
import { getUserPreferences, UserPreferencesData, useUserPreferences } from './lib/userPreferences';
import { useErrorToast } from './components/ErrorToastProvider';

type ConfirmState = {
  open: true;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
} | { open: false };

type View = 'daily' | 'kanban' | 'calendar';

type ExportPayload = {
  version: 1;
  exportedAt: string;
  userId: string;
  preferences: UserPreferencesData;
  theme: ThemeId;
  goals: Goal[];
  tasks: Task[];
  medications: Medication[];
  medicationIntakes: MedicationIntake[];
};

function isExportPayload(value: unknown): value is ExportPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ExportPayload>;
  return (
    payload.version === 1
    && typeof payload.userId === 'string'
    && Array.isArray(payload.goals)
    && Array.isArray(payload.tasks)
    && Array.isArray(payload.medications)
    && Array.isArray(payload.medicationIntakes)
    && payload.preferences !== undefined
    && typeof payload.preferences === 'object'
    && typeof payload.theme === 'string'
  );
}

export default function App() {
  const { showError, showSuccess } = useErrorToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>('kanban');
  const [columnLabels, setColumnLabels] = useState<Record<TaskStatus, string>>(DEFAULT_LABELS);

  const [filters, setFilters] = useState<Filters>({ goalId: null, goalIds: [], search: '', status: null, priority: null, tags: null, dateFrom: null, dateTo: null });

  const [goalModal, setGoalModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null; defaultStatus?: TaskStatus; defaultDate?: string; defaultGoalId?: string | null; returnToArchivesGoal?: Goal | null }>({ open: false, task: null });
  const [archivesModal, setArchivesModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [profileModal, setProfileModal] = useState(false);
  const [preferencesModal, setPreferencesModal] = useState(false);
  const [prescriptionHistoryModal, setPrescriptionHistoryModal] = useState(false);
  const [addressBookModal, setAddressBookModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ open: false });
  const [preferences] = useUserPreferences(user?.id);
  const [now, setNow] = useState(new Date());
  const [weatherTemp, setWeatherTemp] = useState('—');
  const [weatherCondition, setWeatherCondition] = useState('');
  const [weatherFallback, setWeatherFallback] = useState<string | null>(null);
  const [displayedTime, setDisplayedTime] = useState('');
  const [isTimeVisible, setIsTimeVisible] = useState(true);
  const [displayedDate, setDisplayedDate] = useState('');
  const [isDateVisible, setIsDateVisible] = useState(true);
  const [displayedWeatherTemp, setDisplayedWeatherTemp] = useState('');
  const [isWeatherTempVisible, setIsWeatherTempVisible] = useState(true);
  const [displayedWeatherCondition, setDisplayedWeatherCondition] = useState('');
  const [isWeatherConditionVisible, setIsWeatherConditionVisible] = useState(true);
  const [displayedWeatherFallback, setDisplayedWeatherFallback] = useState('');
  const [isWeatherFallbackVisible, setIsWeatherFallbackVisible] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const timeFadeTimeoutRef = useRef<number | null>(null);
  const dateFadeTimeoutRef = useRef<number | null>(null);
  const weatherTempFadeTimeoutRef = useRef<number | null>(null);
  const weatherConditionFadeTimeoutRef = useRef<number | null>(null);
  const weatherFallbackFadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const city = preferences.weatherCity?.trim();
    const hasCoords =
      typeof preferences.weatherLatitude === 'number'
      && typeof preferences.weatherLongitude === 'number';

    if (!city && !hasCoords) {
      setWeatherFallback('Ville météo non définie');
      setWeatherTemp('—');
      setWeatherCondition('');
      return;
    }

    let cancelled = false;

    async function loadWeather() {
      try {
        let latitude = preferences.weatherLatitude;
        let longitude = preferences.weatherLongitude;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`);
          const geoJson = await geoRes.json();
          const first = geoJson?.results?.[0];
          if (!first) {
            if (!cancelled) {
              setWeatherFallback('Ville introuvable');
              setWeatherTemp('—');
              setWeatherCondition('');
            }
            return;
          }
          latitude = first.latitude;
          longitude = first.longitude;
        }

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
        const weatherJson = await weatherRes.json();
        const current = weatherJson?.current;
        if (!current) {
          if (!cancelled) {
            setWeatherFallback('Météo indisponible');
            setWeatherTemp('—');
            setWeatherCondition('');
          }
          return;
        }

        const condition = weatherCodeToFrench(current.weather_code);
        const temp = Math.round(Number(current.temperature_2m));
        if (!cancelled) {
          setWeatherTemp(`${temp}°C`);
          setWeatherCondition(condition);
          setWeatherFallback(null);
        }
      } catch {
        if (!cancelled) {
          setWeatherFallback('Météo indisponible');
          setWeatherTemp('—');
          setWeatherCondition('');
        }
      }
    }

    loadWeather();
    const refreshId = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
    };
  }, [preferences.weatherCity, preferences.weatherLatitude, preferences.weatherLongitude]);

  const formattedNow = useMemo(() => {
    const tz = preferences.timezone;
    const parts = new Intl.DateTimeFormat('fr-CA', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
    }).formatToParts(now);

    const hour = parts.find(p => p.type === 'hour')?.value ?? '';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '';
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value;
    const normalizedHour = hour ? String(Number(hour)) : '';

    if (preferences.timeFormat === '24h') {
      return `${normalizedHour}h${minute}`;
    }

    return dayPeriod ? `${normalizedHour}h${minute} ${dayPeriod}` : `${normalizedHour}h${minute}`;
  }, [now, preferences.timezone, preferences.timeFormat]);

  const formattedWeekday = useMemo(() => {
    const tz = preferences.timezone;
    const weekday = now.toLocaleDateString('fr-CA', {
      timeZone: tz,
      weekday: 'long',
    });

    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }, [now, preferences.timezone]);

  const formattedHeaderDate = useMemo(() => {
    const tz = preferences.timezone;
    return now.toLocaleDateString('fr-CA', {
      timeZone: tz,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [now, preferences.timezone]);

  const formattedLeftDate = useMemo(
    () => `${formattedWeekday} ${formattedHeaderDate}`,
    [formattedWeekday, formattedHeaderDate],
  );

  useEffect(() => {
    if (!displayedTime) {
      setDisplayedTime(formattedNow);
      return;
    }

    if (displayedTime === formattedNow) return;

    setIsTimeVisible(false);
    if (timeFadeTimeoutRef.current !== null) {
      window.clearTimeout(timeFadeTimeoutRef.current);
    }

    timeFadeTimeoutRef.current = window.setTimeout(() => {
      setDisplayedTime(formattedNow);
      setIsTimeVisible(true);
      timeFadeTimeoutRef.current = null;
    }, 300);
  }, [formattedNow, displayedTime]);

  useEffect(() => {
    if (!displayedDate) {
      setDisplayedDate(formattedLeftDate);
      return;
    }

    if (displayedDate === formattedLeftDate) return;

    setIsDateVisible(false);
    if (dateFadeTimeoutRef.current !== null) {
      window.clearTimeout(dateFadeTimeoutRef.current);
    }

    dateFadeTimeoutRef.current = window.setTimeout(() => {
      setDisplayedDate(formattedLeftDate);
      setIsDateVisible(true);
      dateFadeTimeoutRef.current = null;
    }, 300);
  }, [formattedLeftDate, displayedDate]);

  useEffect(() => {
    if (!displayedWeatherTemp) {
      setDisplayedWeatherTemp(weatherTemp);
      return;
    }

    if (displayedWeatherTemp === weatherTemp) return;

    setIsWeatherTempVisible(false);
    if (weatherTempFadeTimeoutRef.current !== null) {
      window.clearTimeout(weatherTempFadeTimeoutRef.current);
    }

    weatherTempFadeTimeoutRef.current = window.setTimeout(() => {
      setDisplayedWeatherTemp(weatherTemp);
      setIsWeatherTempVisible(true);
      weatherTempFadeTimeoutRef.current = null;
    }, 300);
  }, [weatherTemp, displayedWeatherTemp]);

  useEffect(() => {
    if (!displayedWeatherCondition) {
      setDisplayedWeatherCondition(weatherCondition);
      return;
    }

    if (displayedWeatherCondition === weatherCondition) return;

    setIsWeatherConditionVisible(false);
    if (weatherConditionFadeTimeoutRef.current !== null) {
      window.clearTimeout(weatherConditionFadeTimeoutRef.current);
    }

    weatherConditionFadeTimeoutRef.current = window.setTimeout(() => {
      setDisplayedWeatherCondition(weatherCondition);
      setIsWeatherConditionVisible(true);
      weatherConditionFadeTimeoutRef.current = null;
    }, 300);
  }, [weatherCondition, displayedWeatherCondition]);

  useEffect(() => {
    const fallback = weatherFallback ?? '';

    if (!displayedWeatherFallback) {
      setDisplayedWeatherFallback(fallback);
      return;
    }

    if (displayedWeatherFallback === fallback) return;

    setIsWeatherFallbackVisible(false);
    if (weatherFallbackFadeTimeoutRef.current !== null) {
      window.clearTimeout(weatherFallbackFadeTimeoutRef.current);
    }

    weatherFallbackFadeTimeoutRef.current = window.setTimeout(() => {
      setDisplayedWeatherFallback(fallback);
      setIsWeatherFallbackVisible(true);
      weatherFallbackFadeTimeoutRef.current = null;
    }, 300);
  }, [weatherFallback, displayedWeatherFallback]);

  useEffect(() => {
    return () => {
      if (timeFadeTimeoutRef.current !== null) {
        window.clearTimeout(timeFadeTimeoutRef.current);
      }
      if (dateFadeTimeoutRef.current !== null) {
        window.clearTimeout(dateFadeTimeoutRef.current);
      }
      if (weatherTempFadeTimeoutRef.current !== null) {
        window.clearTimeout(weatherTempFadeTimeoutRef.current);
      }
      if (weatherConditionFadeTimeoutRef.current !== null) {
        window.clearTimeout(weatherConditionFadeTimeoutRef.current);
      }
      if (weatherFallbackFadeTimeoutRef.current !== null) {
        window.clearTimeout(weatherFallbackFadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const root = document.documentElement;
    const fontMap: Record<string, string> = {
      'kg-dark-side': "'KGDarkSide', sans-serif",
      'poppins': "'Poppins', sans-serif",
      'quicksand': "'Quicksand', sans-serif",
      'saira': "'Saira', sans-serif",
    };
    const selectedFont = fontMap[preferences.fontFamily] ?? "'KGDarkSide', sans-serif";

    root.style.setProperty('--app-font-family', selectedFont);
    root.style.setProperty('--app-font-scale', '1');
  }, [preferences.fontFamily]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    const initialTheme = storedTheme ?? DEFAULT_THEME;
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function handleThemeChange(nextTheme: ThemeId) {
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

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

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) {
      // Sort by position if it exists, otherwise keep created_at order
      const sorted = data.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        return 0;
      });
      setGoals(sorted as Goal[]);
    }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true });
    if (data) setTasks(data as Task[]);
  }, [user]);

  const archiveCompletedTasks = useCallback(async () => {
    if (!user || !preferences.autoArchiveCompletedTasksAtMidnight) return;
    await supabase
      .from('tasks')
      .update({ archived: true, updated_at: getEstDate().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'done')
      .eq('archived', false);
    fetchTasks();
  }, [user, preferences.autoArchiveCompletedTasksAtMidnight, fetchTasks]);

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchTasks();
    }
  }, [user, fetchGoals, fetchTasks]);

  useEffect(() => {
    if (!user || !preferences.autoArchiveCompletedTasksAtMidnight) return;

    let timeoutId: number | null = null;

    const scheduleMidnightArchive = () => {
      timeoutId = window.setTimeout(async () => {
        await archiveCompletedTasks();
        scheduleMidnightArchive();
      }, getMsUntilNextEstMidnight());
    };

    scheduleMidnightArchive();

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [user, preferences.autoArchiveCompletedTasksAtMidnight, archiveCompletedTasks]);

  function refresh() {
    fetchGoals();
    fetchTasks();
  }

  async function buildExportPayload(): Promise<ExportPayload> {
    if (!user) {
      throw new Error('Utilisateur non connecté.');
    }

    const [goalsRes, tasksRes, medsRes, intakesRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('position', { ascending: true }),
      supabase.from('medications').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('medication_intakes').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    ]);

    if (goalsRes.error || tasksRes.error || medsRes.error || intakesRes.error) {
      throw new Error(goalsRes.error?.message || tasksRes.error?.message || medsRes.error?.message || intakesRes.error?.message || 'Erreur d’exportation');
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      userId: user.id,
      preferences: getUserPreferences(user.id),
      theme,
      goals: (goalsRes.data ?? []) as Goal[],
      tasks: (tasksRes.data ?? []) as Task[],
      medications: (medsRes.data ?? []) as Medication[],
      medicationIntakes: (intakesRes.data ?? []) as MedicationIntake[],
    };
  }

  function downloadExportPayload(payload: ExportPayload, filenamePrefix: string) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateLabel = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${filenamePrefix}-${dateLabel}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleExportUserData() {
    if (!user) return;

    try {
      const payload = await buildExportPayload();
      downloadExportPayload(payload, 'zenscape-export');
      showSuccess('Exportation terminée.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible d’exporter les données.');
    }
  }

  function handleOpenImportDialog() {
    confirm({
      title: 'Importer des données utilisateur',
      message: 'Cette action remplacera toutes vos données actuelles (catégories, tâches, médications et historiques). Voulez-vous continuer?',
      confirmLabel: 'Oui, importer',
      danger: true,
      onConfirm: () => {
        importInputRef.current?.click();
      },
    });
  }

  async function handleImportUserData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;

      if (!isExportPayload(parsed)) {
        throw new Error('Le fichier importé est invalide ou incompatible.');
      }

      const payload = parsed;

      // Safety backup before destructive overwrite.
      const backupPayload = await buildExportPayload();
      downloadExportPayload(backupPayload, 'zenscape-backup-before-import');

      const normalizedGoals = payload.goals.map(goal => ({ ...goal, user_id: user.id }));
      const normalizedTasks = payload.tasks.map(task => ({ ...task, user_id: user.id }));
      const normalizedMeds = payload.medications.map(med => ({ ...med, user_id: user.id }));
      const normalizedIntakes = payload.medicationIntakes.map(intake => ({ ...intake, user_id: user.id }));

      await Promise.all([
        supabase.from('medication_intakes').delete().eq('user_id', user.id),
        supabase.from('medications').delete().eq('user_id', user.id),
        supabase.from('tasks').delete().eq('user_id', user.id),
        supabase.from('goals').delete().eq('user_id', user.id),
      ]);

      if (normalizedGoals.length > 0) {
        const { error } = await supabase.from('goals').insert(normalizedGoals);
        if (error) throw error;
      }

      if (normalizedTasks.length > 0) {
        const { error } = await supabase.from('tasks').insert(normalizedTasks);
        if (error) throw error;
      }

      if (normalizedMeds.length > 0) {
        const { error } = await supabase.from('medications').insert(normalizedMeds);
        if (error) throw error;
      }

      if (normalizedIntakes.length > 0) {
        const { error } = await supabase.from('medication_intakes').insert(normalizedIntakes);
        if (error) throw error;
      }

      try {
        if (payload.preferences) {
          localStorage.setItem(`zenscape.preferences.${user.id}`, JSON.stringify(payload.preferences));
          localStorage.setItem('zenscape.preferences.anonymous', JSON.stringify(payload.preferences));
          window.dispatchEvent(new Event('zenscape-preferences-changed'));
        }
        if (payload.theme) {
          localStorage.setItem(THEME_STORAGE_KEY, payload.theme);
          setTheme(payload.theme);
          applyTheme(payload.theme);
        }
      } catch {
        // no-op: data import in DB remains successful even if localStorage sync fails
      }

      refresh();
      showSuccess('Importation terminée. Vos données ont été restaurées avec succès.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible d’importer les données.');
    }
  }

  function handleDeleteGoal(goalId: string) {
    confirm({
      title: 'Supprimer la catégorie',
      message: 'Cette action supprimera la catégorie et toutes ses tâches définitivement. Cette action est irréversible.',
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
      title: 'Archiver la catégorie',
      message: 'La catégorie sera archivée et n\'apparaîtra plus dans la liste des catégories actives.',
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
      title: 'Désarchiver la catégorie',
      message: 'La catégorie sera restaurée et réapparaîtra dans la liste des catégories actives.',
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

  async function handleDuplicateTask(task: Task) {
    const duplicatedTask: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
      goal_id: task.goal_id,
      user_id: task.user_id,
      title: `${task.title} (copie)`,
      notes: task.notes,
      location: task.location,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      start_date: task.start_date,
      due_date: task.due_date,
      start_time: task.start_time,
      end_time: task.end_time,
      position: Date.now(),
      archived: false,
      recurrence_type: task.recurrence_type,
      recurrence_interval: task.recurrence_interval,
      recurrence_end_date: task.recurrence_end_date,
      recurrence: task.recurrence,
    };

    await supabase.from('tasks').insert([duplicatedTask]);
    fetchTasks();
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
            notes: task.notes,
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

  const filteredTasks = tasks.filter(task => {
    const hasSearch = filters.search.trim().length > 0;
    const includeArchivedInSearch = preferences.searchIncludeArchivedTasks && hasSearch;
    if (task.archived && !includeArchivedInSearch) return false;
    if (filters.goalIds && filters.goalIds.length > 0 && !filters.goalIds.includes(task.goal_id)) return false;
    if (hasSearch) {
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

  // Variante dédiée au calendrier: on applique les mêmes filtres,
  // mais on conserve les tâches archivées terminées pour qu'elles
  // puissent aussi être filtrées (ex: priorité "moyenne").
  const calendarFilteredAllTasks = tasks.filter(task => {
    const hasSearch = filters.search.trim().length > 0;
    const includeArchivedInSearch = preferences.searchIncludeArchivedTasks && hasSearch;
    const keepArchivedDoneForCalendar = task.archived && task.status === 'done';
    if (task.archived && !includeArchivedInSearch && !keepArchivedDoneForCalendar) return false;
    if (filters.goalIds && filters.goalIds.length > 0 && !filters.goalIds.includes(task.goal_id)) return false;
    if (hasSearch) {
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

  const hasActiveTaskFilters =
    (filters.goalIds?.length ?? 0) > 0 ||
    filters.search.trim().length > 0 ||
    filters.status !== null ||
    (filters.priority?.length ?? 0) > 0 ||
    (filters.tags?.length ?? 0) > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

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
      <header className="pb-2 mb-1 flex-shrink-0">
        <div className="grid grid-cols-3 grid-rows-2 items-center gap-x-4 gap-y-1 mb-1">
          <div className="text-sm font-bold leading-none justify-self-start self-start -mt-1 col-start-1 row-start-1">
            <span className={`pl-1 transition-opacity duration-300 ${isDateVisible ? 'opacity-100' : 'opacity-0'}`}>
              {displayedDate}
            </span>
            <span> · </span>
            <span className={`transition-opacity duration-300 ${isTimeVisible ? 'opacity-100' : 'opacity-0'}`}>
              {displayedTime}
            </span>
          </div>

          <div className="justify-self-center px-4 py-1 row-span-2 col-start-2 row-start-1">
            <img
              src="./images/logo.png"
              alt="ZenScape"
              className="h-14 object-contain"
            />
          </div>

          <div className="pr-1 text-sm font-bold leading-none whitespace-nowrap justify-self-end self-start -mt-1 col-start-3 row-start-1">
            {displayedWeatherFallback ? (
              <>
                <span className={`transition-opacity duration-300 ${isWeatherFallbackVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {displayedWeatherFallback}
                </span>
                <span> · {(preferences.weatherCity?.trim() || 'Ville météo')}</span>
              </>
            ) : (
              <>
                <span className={`transition-opacity duration-300 ${isWeatherTempVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {displayedWeatherTemp}
                </span>
                <span> · </span>
                <span className={`transition-opacity duration-300 ${isWeatherConditionVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {displayedWeatherCondition}
                </span>
                <span> · {(preferences.weatherCity?.trim() || 'Ville météo')}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 justify-self-start self-start -mt-2 col-start-1 row-start-2">
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

          <div className="flex items-center gap-3 justify-self-end self-start -mt-2 col-start-3 row-start-2">
            <div className="relative h-[36px] w-[320px] shrink-0">
              <div
                className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                  isSearchOpen
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                <input
                  ref={searchInputRef}
                  id="task-search"
                  name="search"
                  type="text"
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  onBlur={() => {
                    if (filters.search.trim().length === 0) {
                      setIsSearchOpen(false);
                    }
                  }}
                  placeholder="Rechercher une tâche..."
                  className="h-[36px] w-full pl-3 pr-10 py-0 text-sm border-2 border-ink-black bg-ink-black/15 placeholder:text-ink-black/70 focus:outline-none"
                  style={{ boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 p-0 bg-transparent border-0 text-ink-black"
                title="Rechercher"
                aria-label="Ouvrir la recherche"
              >
                <Search size={18} />
              </button>
            </div>

            <UserMenu
              user={user}
              onProfileClick={() => setProfileModal(true)}
              onPreferencesClick={() => setPreferencesModal(true)}
              onThemeClick={() => setThemeModal(true)}
              onPrescriptionHistoryClick={() => setPrescriptionHistoryModal(true)}
              onAddressBookClick={() => setAddressBookModal(true)}
              onExportDataClick={handleExportUserData}
              onImportDataClick={handleOpenImportDialog}
            />
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportUserData}
            />
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* SIDEBAR */}
        <div className="w-72 shrink-0 min-h-0 flex flex-col">
          <button
            onClick={() => setTaskModal({ open: true, task: null })}
            className="retro-btn bg-ink-red text-paper text-base h-14 flex items-center justify-center gap-2 shrink-0 mb-3"
          >
            Nouvelle tâche
          </button>

          <div className="flex-1 min-h-0">
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
              onRefresh={fetchGoals}
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-4">
          {view === 'daily' ? (
            <DailyView
              tasks={tasks}
              goals={goals}
              onEditTask={task => setTaskModal({ open: true, task })}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onArchiveTask={handleArchiveTask}
              onChangeTaskStatus={handleChangeTaskStatus}
            />
          ) : view === 'kanban' ? (
            <KanbanView
              tasks={filteredTasks}
              goals={goals}
              columnLabels={columnLabels}
              onEditTask={task => setTaskModal({ open: true, task })}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onArchiveTask={handleArchiveTask}
              onChangeTaskStatus={handleChangeTaskStatus}
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
                  notes: null,
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
              allTasks={hasActiveTaskFilters ? calendarFilteredAllTasks : tasks}
              goals={goals}
              onEditTask={task => setTaskModal({ open: true, task })}
              onNewTask={date => setTaskModal({ open: true, task: null, defaultDate: date })}
              onChangeTaskStatus={handleChangeTaskStatus}
            />
          )}

          <div
            className="shrink-0 border-2 border-ink-black px-4 py-2.5"
            style={{
              backgroundColor: 'var(--theme-surface)',
              boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)'
            }}
          >
            <FilterBar filters={filters} tasks={tasks} goals={goals} onChange={setFilters} />
          </div>
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
          onClose={() => {
            const returnGoal = taskModal.returnToArchivesGoal;
            setTaskModal({ open: false, task: null, returnToArchivesGoal: null });
            if (returnGoal) {
              setArchivesModal({ open: true, goal: returnGoal });
            }
          }}
          onSaved={refresh}
        />
      )}

      {archivesModal.open && archivesModal.goal && (
        <ArchivesModal
          goal={archivesModal.goal}
          archivedTasks={tasks.filter(t => {
            if (t.goal_id !== archivesModal.goal!.id || !t.archived) return false;
            if (!preferences.archiveModalApplyTagFilters) return true;
            const matchesTags = !filters.tags || filters.tags.length === 0
              ? true
              : filters.tags.some(tag => t.tags.includes(tag));
            const matchesPriority = !filters.priority || filters.priority.length === 0
              ? true
              : filters.priority.includes(t.priority);
            return matchesTags && matchesPriority;
          })}
          hasActiveArchiveFilters={
            preferences.archiveModalApplyTagFilters
            && ((filters.tags?.length ?? 0) > 0 || (filters.priority?.length ?? 0) > 0)
          }
          onEdit={(task) => {
            const currentGoal = archivesModal.goal;
            setArchivesModal({ open: false, goal: null });
            setTaskModal({ open: true, task, returnToArchivesGoal: currentGoal });
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
        <ProfileModal 
          user={user} 
          onClose={() => setProfileModal(false)} 
        />
      )}

      {preferencesModal && (
        <PreferencesModal 
          user={user} 
          onClose={() => setPreferencesModal(false)} 
        />
      )}

      {prescriptionHistoryModal && (
        <PrescriptionHistoryModal user={user} onClose={() => setPrescriptionHistoryModal(false)} />
      )}

      {addressBookModal && (
        <AddressBookModal
          user={user}
          onClose={() => setAddressBookModal(false)}
          onUpdated={fetchTasks}
        />
      )}

      <ThemeModal
        open={themeModal}
        selectedTheme={theme}
        onSelectTheme={handleThemeChange}
        onClose={() => setThemeModal(false)}
      />

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

function weatherCodeToFrench(code: number): string {
  const map: Record<number, string> = {
    0: 'Ensoleillé',
    1: 'Principalement ensoleillé',
    2: 'Partiellement nuageux',
    3: 'Nuageux',
    45: 'Brumeux',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine',
    55: 'Bruine dense',
    56: 'Bruine verglaçante légère',
    57: 'Bruine verglaçante',
    61: 'Pluie légère',
    63: 'Pluie',
    65: 'Forte pluie',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante',
    71: 'Neige légère',
    73: 'Neige',
    75: 'Forte neige',
    77: 'Grains de neige',
    80: 'Averses légères',
    81: 'Averses',
    82: 'Fortes averses',
    85: 'Averses de neige légères',
    86: 'Averses de neige fortes',
    95: 'Orage',
    96: 'Orage avec grêle légère',
    99: 'Orage avec grêle',
  };

  return map[code] ?? 'Conditions variables';
}
