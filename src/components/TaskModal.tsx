import { useState, useEffect } from 'react';
import { X } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { getEstDate } from '../lib/timezone';
import { Task, Goal, TaskStatus, TaskPriority, RecurrenceType } from '../types';
import { getNextRecurrenceDate } from '../lib/recurrence';
import Dropdown, { DropdownOption } from './Dropdown';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import LocationInput from './LocationInput';

interface Props {
  task: Task | null;
  goals: Goal[];
  columnLabels: Record<TaskStatus, string>;
  defaultGoalId?: string | null;
  defaultStatus?: TaskStatus;
  defaultDate?: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITY_OPTIONS: DropdownOption[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'urgent', label: 'Urgent' },
];

const UNIT_OPTIONS: DropdownOption[] = [
  { value: 'days', label: 'jours' },
  { value: 'weeks', label: 'semaines' },
  { value: 'months', label: 'mois' },
  { value: 'years', label: 'années' },
];

type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years';

function unitToType(unit: RecurrenceUnit, interval: number): RecurrenceType {
  if (unit === 'days' && interval === 1) return 'daily';
  if (unit === 'weeks' && interval === 1) return 'weekly';
  return 'custom';
}

function unitToInterval(unit: RecurrenceUnit, interval: number): number {
  if (unit === 'days') return interval;
  if (unit === 'weeks') return interval * 7;
  if (unit === 'months') return interval * 30;
  if (unit === 'years') return interval * 365;
  return interval;
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function isEndTimeEarlier(start: string, end: string): boolean {
  if (!start || !end) return false;
  return end < start;
}

export default function TaskModal({ task, goals, columnLabels, defaultGoalId, defaultStatus, defaultDate, userId, onClose, onSaved }: Props) {
  const statusOptions: DropdownOption[] = [
    { value: 'todo', label: 'Planification' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'done', label: 'Terminé' },
  ];

  const [goalId, setGoalId] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Recurrence state
  const [recurrenceIntervalInput, setRecurrenceIntervalInput] = useState('');
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('days');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const recurrenceInterval = parseInt(recurrenceIntervalInput) || 0;
  const recurrenceActive = recurrenceInterval > 0;

  useEffect(() => {
    async function loadLocationsAndTags() {
      const { data: locData } = await supabase
        .from('tasks')
        .select('location')
        .eq('user_id', userId)
        .not('location', 'is', null);

      if (locData) {
        const unique = [...new Set(locData.map(t => t.location).filter(Boolean))].sort();
        setLocationSuggestions(unique);
      }

      const { data: taskData } = await supabase
        .from('tasks')
        .select('tags')
        .eq('user_id', userId);

      if (taskData) {
        const allTagsSet = new Set<string>();
        taskData.forEach(t => {
          if (t.tags && Array.isArray(t.tags)) {
            t.tags.forEach((tag: string) => allTagsSet.add(tag));
          }
        });
        setAllTags(Array.from(allTagsSet).sort());
      }
    }
    loadLocationsAndTags();
  }, [userId]);

  useEffect(() => {
    if (task) {
      setGoalId(task.goal_id);
      setTitle(task.title);
      setLocation(task.location ?? '');
      setStatus(task.status);
      setPriority(task.priority);
      setStartDate(task.start_date ?? '');
      setDueDate(task.due_date ?? '');
      setStartTime(task.start_time ?? '');
      setEndTime(task.end_time ?? '');
      setTagsInput(task.tags.join(', '));
      setRecurrenceEndDate(task.recurrence_end_date ?? '');

      // Reverse-map legacy interval back to unit + count
      const iv = task.recurrence_interval ?? 0;
      if (iv === 0 || task.recurrence_type === 'none') {
        setRecurrenceIntervalInput('');
        setRecurrenceUnit('days');
      } else if (task.recurrence_type === 'daily' || (iv % 1 === 0 && iv < 7)) {
        setRecurrenceIntervalInput(String(iv));
        setRecurrenceUnit('days');
      } else if (iv % 365 === 0) {
        setRecurrenceIntervalInput(String(iv / 365));
        setRecurrenceUnit('years');
      } else if (iv % 30 === 0) {
        setRecurrenceIntervalInput(String(iv / 30));
        setRecurrenceUnit('months');
      } else if (iv % 7 === 0) {
        setRecurrenceIntervalInput(String(iv / 7));
        setRecurrenceUnit('weeks');
      } else {
        setRecurrenceIntervalInput(String(iv));
        setRecurrenceUnit('days');
      }
    } else {
      if (defaultGoalId) setGoalId(defaultGoalId);
      else setGoalId('');
      if (defaultStatus) setStatus(defaultStatus);
      if (defaultDate) {
        setStartDate(defaultDate);
        setDueDate('');
      }
    }
  }, [task, defaultGoalId, defaultStatus, defaultDate, goals]);

  useEffect(() => {
    // Task modal behavior (new + edit):
    // if end time is earlier than start time, auto-roll due date to next day.
    if (!startDate || !startTime || !endTime) return;
    if (!isEndTimeEarlier(startTime, endTime)) return;

    const nextDay = addOneDay(startDate);
    if (dueDate !== nextDay) setDueDate(nextDay);
  }, [task, startDate, startTime, endTime, dueDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goalId) { setError('Veuillez sélectionner un projet'); return; }
    setLoading(true);
    setError(null);

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    let resolvedType: RecurrenceType = 'none';
    let resolvedInterval: number | null = null;
    if (recurrenceActive) {
      resolvedType = unitToType(recurrenceUnit, recurrenceInterval);
      resolvedInterval = unitToInterval(recurrenceUnit, recurrenceInterval);
    }

    const payload = {
      goal_id: goalId,
      title,
      location,
      status,
      priority,
      tags,
      start_date: startDate || null,
      due_date: dueDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      recurrence_type: resolvedType,
      recurrence_interval: resolvedInterval,
      recurrence_end_date: (recurrenceActive && recurrenceEndDate) ? recurrenceEndDate : null,
      updated_at: getEstDate().toISOString(),
    };

    if (task) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', task.id);
      if (error) { setError(error.message); setLoading(false); return; }

      if (status === 'done' && task.status !== 'done' && task.recurrence) {
        const baseDate = (dueDate || startDate) || task.due_date || task.start_date;
        if (baseDate) {
          const nextDate = getNextRecurrenceDate(baseDate, task.recurrence);
          if (nextDate) {
            const newTask = {
              goal_id: goalId,
              user_id: userId,
              title,
              location,
              status: 'todo',
              priority,
              tags,
              start_date: startDate ? nextDate : null,
              due_date: dueDate ? nextDate : null,
              start_time: startTime || null,
              end_time: endTime || null,
              position: Date.now(),
              archived: false,
              recurrence_type: resolvedType,
              recurrence_interval: resolvedInterval,
              recurrence_end_date: (recurrenceActive && recurrenceEndDate) ? recurrenceEndDate : null,
            };
            await supabase.from('tasks').insert([newTask]);
          }
        }
      }
    } else {
      const { error } = await supabase.from('tasks').insert({ ...payload, user_id: userId, position: Date.now() });
      if (error) { setError(error.message); setLoading(false); return; }
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  const goalOptions: DropdownOption[] = [
    { value: '', label: 'Sélectionner un projet...' },
    ...goals.filter(g => g.status !== 'archived').sort((a, b) => a.title.localeCompare(b.title)).map(g => ({ value: g.id, label: g.title })),
  ];

  const handleTagsInputChange = (value: string) => {
    setTagsInput(value);

    const lastCommaIndex = value.lastIndexOf(',');
    const currentTagInput = lastCommaIndex === -1
      ? value.trim()
      : value.substring(lastCommaIndex + 1).trim();

    if (currentTagInput.length > 0) {
      const filtered = allTags.filter(tag =>
        tag.toLowerCase().startsWith(currentTagInput.toLowerCase()) &&
        !tagsInput.split(',').map(t => t.trim()).includes(tag)
      );
      setTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const handleTagSelect = (tag: string) => {
    const lastCommaIndex = tagsInput.lastIndexOf(',');
    let newTagsInput: string;

    if (lastCommaIndex === -1) {
      newTagsInput = tag + ', ';
    } else {
      newTagsInput = tagsInput.substring(0, lastCommaIndex + 1) + ' ' + tag + ', ';
    }

    setTagsInput(newTagsInput);
    setShowTagSuggestions(false);
  };

  return (
    <div className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-[1000] p-4">
      <div
        className="retro-card w-full max-w-lg bg-paper flex flex-col"
        style={{ boxShadow: '8px 8px 0 #1a1a1a', maxHeight: '92vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper shrink-0">
          <h2 className="font-display text-lg uppercase">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

          <div>
            <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Projet *</label>
            <Dropdown value={goalId} onChange={setGoalId} options={goalOptions} placeholder="Sélectionner un projet..." />
          </div>

          <div>
            <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="retro-input !bg-transparent"
              required
            />
          </div>

          <div>
            <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Emplacement</label>
            <LocationInput value={location} onChange={setLocation} suggestions={locationSuggestions} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Statut</label>
              <Dropdown value={status} onChange={v => setStatus(v as TaskStatus)} options={statusOptions} />
            </div>
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Priorité</label>
              <Dropdown value={priority} onChange={v => setPriority(v as TaskPriority)} options={PRIORITY_OPTIONS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Date de début</label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Date de début" openAbove />
            </div>
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Date d'échéance</label>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="Date d'échéance" openAbove alignRight />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 h-5">
                <label className="font-bold text-xs uppercase tracking-wide">Heure de début</label>
                {startTime && (
                  <button
                    type="button"
                    onClick={() => setStartTime('')}
                    className="flex items-center justify-center text-ink-black hover:text-ink-red transition-colors p-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 h-5">
                <label className="font-bold text-xs uppercase tracking-wide">Heure de fin</label>
                {endTime && (
                  <button
                    type="button"
                    onClick={() => setEndTime('')}
                    className="flex items-center justify-center text-ink-black hover:text-ink-red transition-colors p-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          <div className="relative">
            <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Tags (séparés par des virgules)</label>
            <div className="relative">
              <input
                type="text"
                value={tagsInput}
                onChange={e => handleTagsInputChange(e.target.value)}
                onFocus={() => {
                  const lastCommaIndex = tagsInput.lastIndexOf(',');
                  const currentTagInput = lastCommaIndex === -1
                    ? tagsInput.trim()
                    : tagsInput.substring(lastCommaIndex + 1).trim();
                  if (currentTagInput.length > 0) {
                    const filtered = allTags.filter(tag =>
                      tag.toLowerCase().startsWith(currentTagInput.toLowerCase()) &&
                      !tagsInput.split(',').map(t => t.trim()).includes(tag)
                    );
                    setTagSuggestions(filtered);
                    setShowTagSuggestions(filtered.length > 0);
                  }
                }}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                className="retro-input !bg-transparent w-full"
              />
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-paper border-2 border-ink-black z-10 max-h-32 overflow-y-auto">
                  {tagSuggestions.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTagSelect(tag)}
                      className="w-full text-left px-3 py-2 hover:bg-ink-blue/20 text-sm transition-colors border-b border-ink-black/10 last:border-b-0"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recurrence */}
          <div className="border-t-2 border-ink-black/15 pt-4 flex flex-col gap-3">
            <label className="font-bold text-xs uppercase tracking-wide">Récurrence</label>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold shrink-0">Répéter tous les</span>
              <input
                type="number"
                min="1"
                max="9"
                value={recurrenceIntervalInput}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || (parseInt(v) > 0 && parseInt(v) <= 9)) setRecurrenceIntervalInput(v);
                }}
                placeholder="—"
                className="retro-input !bg-transparent w-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div
                className="w-40 transition-opacity shrink-0"
                style={{ opacity: recurrenceActive ? 1 : 0.35, pointerEvents: recurrenceActive ? 'auto' : 'none' }}
              >
                <Dropdown
                  value={recurrenceUnit}
                  onChange={v => setRecurrenceUnit(v as RecurrenceUnit)}
                  options={UNIT_OPTIONS}
                />
              </div>
            </div>

            <div
              className="transition-opacity"
              style={{ opacity: recurrenceActive ? 1 : 0.35, pointerEvents: recurrenceActive ? 'auto' : 'none' }}
            >
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Date de fin de récurrence</label>
              <DatePicker
                value={recurrenceEndDate}
                onChange={setRecurrenceEndDate}
                placeholder="Pas de fin"
                openAbove
              />
            </div>
          </div>

          {error && <div className="border-2 border-ink-red p-3 text-ink-red text-xs">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="retro-btn flex-1 bg-transparent hover:bg-ink-black hover:text-paper transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className={`retro-btn flex-1 text-paper hover:bg-ink-red transition-colors ${task ? 'bg-ink-red' : 'bg-ink-black'}`}>
              {loading ? 'Enregistrement...' : task ? 'Mettre à jour' : 'Déployer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
