import { useState, useEffect } from 'react';
import { X, Check } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { getEstDate } from '../lib/timezone';
import { Goal } from '../types';
import DatePicker from './DatePicker';
import { fgForBg } from '../lib/goalColors';

interface Props {
  goal: Goal | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const CUSTOM_COLORS = [
  '#FF4D4D', '#CC0000', '#660000', '#FF944D', '#CC5200', '#663300',
  '#FFFF66', '#CCCC00', '#666600', '#B3FF66', '#66CC00', '#336600',
  '#66FF66', '#00CC00', '#006600', '#66FFB3', '#00CC66', '#006633',
  '#66FFFF', '#00CCCC', '#006666', '#66B3FF', '#0066CC', '#003366',
  '#6666FF', '#0000CC', '#000066', '#B366FF', '#6600CC', '#330066',
  '#FF66FF', '#CC00CC', '#660066', '#FF66B3', '#CC0066', '#660033',
];

export default function GoalModal({ goal, userId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

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
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.from('goals').insert({ ...payload, user_id: userId });
      if (error) { setError(error.message); setLoading(false); return; }
    }

    setLoading(false);
    onSaved();
    onClose();
  }


  return (
    <div className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-50 p-4">
      <div className="retro-card w-full max-w-lg bg-paper" style={{ boxShadow: '8px 8px 0 #1a1a1a' }}>
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-blue text-paper">
          <h2 className="font-display text-lg uppercase">{goal ? 'Modifier le projet' : 'Nouveau projet'}</h2>
          <button onClick={onClose} className="hover:text-ink-red transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="font-bold text-xs uppercase block mb-2 tracking-wide">Titre *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="retro-input !bg-transparent" required placeholder="" />
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
              {color && (
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className="text-[10px] uppercase font-bold text-ink-black/40 hover:text-ink-red transition-colors tracking-wide"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 p-3 border-2 border-ink-black" style={{ boxShadow: '4px 4px 0 #1a1a1a' }}>
              {CUSTOM_COLORS.map(c => {
                const isSelected = color === c;
                const fg = fgForBg(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(isSelected ? null : c)}
                    className="w-7 h-7 border-2 border-ink-black flex items-center justify-center transition-transform duration-75 hover:scale-110"
                    style={{
                      backgroundColor: c,
                      boxShadow: '2px 2px 0 #1a1a1a',
                      transform: isSelected ? 'scale(1.15)' : undefined,
                    }}
                    title={c}
                  >
                    {isSelected && <Check size={12} color={fg} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

          </div>

          {error && <div className="border-2 border-ink-red p-3 text-ink-red text-xs">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="retro-btn flex-1 bg-transparent hover:bg-ink-black hover:text-paper transition-colors">Annuler</button>
            <button type="submit" disabled={loading} className={`retro-btn flex-1 text-paper hover:bg-ink-red transition-colors ${goal ? 'bg-ink-red' : 'bg-ink-black'}`}>
              {loading ? 'Enregistrement...' : goal ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
