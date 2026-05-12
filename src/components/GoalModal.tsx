import { useState, useEffect } from 'react';
import { Check } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { getEstDate } from '../lib/timezone';
import { Goal } from '../types';
import DatePicker from './DatePicker';
import { fgForBg } from '../lib/goalColors';
import { useErrorToast } from './ErrorToastProvider';
import ModalCloseButton from './ModalCloseButton';

interface Props {
  goal: Goal | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const CUSTOM_COLORS = Array.from({ length: 32 }, (_, i) => `var(--goal-color-${i + 1})`);

export default function GoalModal({ goal, userId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useErrorToast();

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setStartDate(goal.start_date ?? '');
      setEndDate(goal.end_date ?? '');
      setStatus(goal.status);
      setColor(goal.color ?? null);
    }
  }, [goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      color: color || null,
      updated_at: getEstDate().toISOString(),
    };

    if (goal) {
      const { error } = await supabase.from('goals').update(payload).eq('id', goal.id);
      if (error) { showError(error.message); setLoading(false); return; }
    } else {
      // Try to get the max position for new goals (if column exists)
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('position')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const insertPayload: any = { 
        ...payload, 
        user_id: userId,
      };

      // Only add position if the column exists (check if any goal has it)
      if (existingGoals && existingGoals.length > 0 && existingGoals[0].position !== undefined) {
        const maxPosition = existingGoals[0].position || 0;
        insertPayload.position = maxPosition + 1000;
      }

      const { error } = await supabase.from('goals').insert(insertPayload);
      if (error) { showError(error.message); setLoading(false); return; }
    }

    setLoading(false);
    onSaved();
    onClose();
  }


  return (
    <div className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-[1000] p-4">
      <div className="retro-card w-full max-w-lg bg-paper" style={{ boxShadow: '8px 8px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper">
          <h2 className="font-display text-lg uppercase">{goal ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
          <ModalCloseButton onClose={onClose} className="text-paper" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div>
            <label htmlFor="goal-title" className="font-bold text-xs uppercase block mb-2 tracking-wide">Titre *</label>
            <input id="goal-title" name="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="retro-input" required placeholder="" />
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
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-xs uppercase tracking-wide">Couleur des cartes</label>
              <button
                type="button"
                onClick={() => setColor(null)}
                className={`text-[10px] uppercase font-bold transition-colors tracking-wide ${
                  color
                    ? 'text-ink-black/40 hover:text-ink-red'
                    : 'text-transparent pointer-events-none select-none'
                }`}
                aria-hidden={!color}
              >
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 p-3 border-2 border-ink-black" style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>
              {CUSTOM_COLORS.map(c => {
                const isSelected = color === c;
                const fg = fgForBg(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(isSelected ? null : c)}
                    className="w-7 h-7 border-2 border-ink-black flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                    }}
                    title={c}
                  >
                    {isSelected && <Check size={12} color={fg} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              {loading ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
