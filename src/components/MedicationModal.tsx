import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getEstDate, getEstDateString } from '../lib/timezone';
import { Medication, RecurrenceType } from '../types';
import Dropdown, { DropdownOption } from './Dropdown';
import DatePicker from './DatePicker';
import Checkbox from './Checkbox';

interface Props {
  medication: Medication | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const TIME_OF_DAY_OPTIONS: DropdownOption[] = [
  { value: 'morning', label: 'Matin' },
  { value: 'afternoon', label: 'Après-midi' },
  { value: 'evening', label: 'Soir' },
  { value: 'bedtime', label: 'Coucher' },
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

export default function MedicationModal({ medication, userId, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [takeWithFood, setTakeWithFood] = useState(false);

  // Recurrence state
  const [recurrenceTimesInput, setRecurrenceTimesInput] = useState('');
  const [recurrenceIntervalInput, setRecurrenceIntervalInput] = useState('');
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('days');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recurrenceTimes = parseInt(recurrenceTimesInput) || 0;
  const recurrenceInterval = parseInt(recurrenceIntervalInput) || 0;
  const recurrenceActive = recurrenceTimes > 0 && recurrenceInterval > 0;

  useEffect(() => {
    if (medication) {
      setName(medication.name);
      setDosage(medication.dosage);
      setTimeOfDay(medication.time_of_day);
      setStartDate(medication.start_date);
      setEndDate(medication.end_date || '');
      setNotes(medication.notes || '');
      setTakeWithFood(medication.take_with_food);
      setRecurrenceEndDate(medication.recurrence_end_date || '');

      // Reverse-map legacy interval back to unit + count
      const iv = medication.recurrence_interval ?? 0;
      if (iv === 0 || medication.recurrence_type === 'none') {
        setRecurrenceTimesInput('');
        setRecurrenceIntervalInput('');
        setRecurrenceUnit('days');
      } else if (medication.recurrence_type === 'daily' || (iv % 1 === 0 && iv < 7)) {
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
      setStartDate(getEstDateString());
    }
  }, [medication]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let resolvedType: RecurrenceType = 'none';
    let resolvedInterval: number | null = null;
    let frequency = 'Not specified';

    if (recurrenceActive) {
      resolvedType = unitToType(recurrenceUnit, recurrenceInterval);
      resolvedInterval = unitToInterval(recurrenceUnit, recurrenceInterval);

      // Generate human-readable frequency string
      if (resolvedType === 'daily') {
        frequency = recurrenceInterval === 1 ? 'Une fois par jour' : `${recurrenceTimes}x par jour`;
      } else if (resolvedType === 'weekly') {
        frequency = recurrenceInterval === 7 ? 'Une fois par semaine' : `Tous les ${recurrenceInterval} jours`;
      } else {
        frequency = `Tous les ${recurrenceInterval} jours`;
      }
    }

    const payload = {
      name,
      dosage,
      frequency,
      time_of_day: timeOfDay,
      start_date: startDate,
      end_date: endDate || null,
      notes: notes || null,
      take_with_food: takeWithFood,
      recurrence_type: resolvedType,
      recurrence_interval: resolvedInterval,
      recurrence_end_date: (recurrenceActive && recurrenceEndDate) ? recurrenceEndDate : null,
      updated_at: getEstDate().toISOString(),
    };

    try {
      if (medication) {
        const { error: err } = await supabase
          .from('medications')
          .update(payload)
          .eq('id', medication.id);
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
      } else {
        const { error: err } = await supabase
          .from('medications')
          .insert({ ...payload, user_id: userId });
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
      }
      setLoading(false);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="retro-card w-full max-w-lg bg-paper flex flex-col"
        style={{ boxShadow: '8px 8px 0 #1a1a1a', maxHeight: '92vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-yellow text-ink-black shrink-0">
          <h2 className="font-display text-lg uppercase">{medication ? 'Modifier la prescription' : 'Nouvelle prescription'}</h2>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div>
            <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Nom du médicament *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="retro-input !bg-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Dosage *</label>
              <input
                type="text"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                className="retro-input !bg-transparent"
                required
                placeholder="Ex: 200mg"
              />
            </div>
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Moment de la journée</label>
              <Dropdown
                value={timeOfDay}
                onChange={setTimeOfDay}
                options={TIME_OF_DAY_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Date de début</label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Date de début" />
            </div>
            <div>
              <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Date de fin</label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Date de fin" />
            </div>
          </div>

          <div>
            <label className="font-bold text-xs uppercase block mb-4 tracking-wide">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="retro-input !bg-transparent resize-none"
              rows={2}
            />
          </div>

          <Checkbox
            id="takeWithFood"
            checked={takeWithFood}
            onChange={setTakeWithFood}
            label="Prendre avec de la nourriture"
          />

          {/* Recurrence */}
          <div className="border-t-2 border-ink-black/15 pt-4 flex flex-col gap-3">
            <label className="font-bold text-xs uppercase tracking-wide">Récurrence</label>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold shrink-0">Prendre</span>
              <input
                type="number"
                min="1"
                max="999"
                value={recurrenceTimesInput}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || (parseInt(v) > 0 && parseInt(v) <= 999)) setRecurrenceTimesInput(v);
                }}
                placeholder="—"
                className="retro-input !bg-transparent w-[40px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-bold shrink-0">fois tous les</span>
              <input
                type="number"
                min="1"
                max="999"
                value={recurrenceIntervalInput}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || (parseInt(v) > 0 && parseInt(v) <= 999)) setRecurrenceIntervalInput(v);
                }}
                placeholder="—"
                className="retro-input !bg-transparent w-[46px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div
                className="flex-1 transition-opacity"
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
              />
            </div>
          </div>

          {error && <div className="border-2 border-ink-red p-3 text-ink-red text-xs">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="retro-btn flex-1 bg-transparent hover:bg-ink-black hover:text-paper transition-colors">Annuler</button>
            <button type="submit" disabled={loading} className={`retro-btn flex-1 text-paper hover:bg-ink-red transition-colors ${medication ? 'bg-ink-red' : 'bg-ink-black'}`}>
              {loading ? 'Enregistrement...' : medication ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
