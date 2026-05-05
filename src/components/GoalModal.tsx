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
  // Reds & Pinks (8 colors)
  '#FF6B6B', '#FF8A8A', '#FFB3B3', '#FFE0E0',
  '#FF4444', '#E63946', '#D62828', '#A4161A',
  // Oranges (8 colors)
  '#FFA500', '#FFB84D', '#FFCC99', '#FFE6CC',
  '#FF8C00', '#E67E22', '#D35400', '#B8651B',
  // Yellows & Lime (8 colors)
  '#FFEB3B', '#FFFF66', '#FFFF99', '#FFFFCC',
  '#FFD700', '#FFC107', '#FFA000', '#FF8F00',
  // Greens (8 colors)
  '#66FF66', '#99FF99', '#B3FFB3', '#D4FFDD',
  '#00CC00', '#4CAF50', '#45A049', '#2E7D32',
  // Cyan & Turquoise (8 colors)
  '#66FFFF', '#99FFFF', '#B3FFFF', '#CCFFFF',
  '#00CCCC', '#00BCD4', '#0097A7', '#00838F',
  // Blues (8 colors)
  '#66B3FF', '#99CCFF', '#B3D9FF', '#CCEBFF',
  '#0066CC', '#1E90FF', '#1976D2', '#1565C0',
  // Purples (8 colors)
  '#B366FF', '#CC99FF', '#D9B3FF', '#E6D9FF',
  '#9966FF', '#7C3AED', '#6D28D9', '#5B21B6',
  // Magentas (8 colors)
  '#FF66FF', '#FF99FF', '#FFB3FF', '#FFCCFF',
  '#FF00FF', '#E60BB4', '#D60095', '#BD0076',
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
    <div className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-[1000] p-4">
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
            <div className="grid grid-cols-8 gap-2 p-3 border-2 border-ink-black" style={{ boxShadow: '4px 4px 0 #1a1a1a' }}>
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
                      boxShadow: '2px 2px 0 #1a1a1a',
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
