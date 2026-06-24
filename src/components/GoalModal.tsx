import { useState, useEffect } from 'react';
import { Check } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { getEstDate } from '../lib/timezone';
import { Goal } from '../types';
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
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useErrorToast();

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
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
    <>
      <div className="fixed inset-0 z-[1000] bg-ink-black/60" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-paper transform transition-transform duration-300 ease-in-out z-[1001] flex flex-col"
        style={{
          transform: 'translateX(0)',
          borderLeft: '4px solid #1a1a1a',
          boxShadow: '8px 8px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper shrink-0">
          <h2 className="font-display text-lg uppercase">{goal ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
          <ModalCloseButton onClose={onClose} className="text-paper" />
        </div>

        <form
          id="goal-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-5"
          style={{
            backgroundColor: 'var(--theme-surface)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div>
            <label htmlFor="goal-title" className="font-bold text-xs uppercase block mb-2 tracking-wide">Titre *</label>
            <input id="goal-title" name="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="retro-input" required placeholder="" />
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
        </form>

        <div className="px-6 pb-6 pt-6 border-t-4 border-ink-black shrink-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="goal-modal-form"
              disabled={loading}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              Confirmer
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
