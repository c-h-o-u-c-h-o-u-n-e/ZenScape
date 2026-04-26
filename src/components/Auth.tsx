import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl uppercase text-ink-red bleed-anim mb-8 text-center" style={{ textShadow: '4px 4px 0 #457b9d', letterSpacing: '-2px' }}>
          Goal-O-Matic
        </h1>

        <div className="retro-card p-8">
          <div className="flex gap-4 mb-8 border-b-4 border-ink-black pb-4">
            <button
              onClick={() => setMode('login')}
              className={`font-display text-xl uppercase pb-1 border-b-4 transition-colors ${mode === 'login' ? 'border-ink-red' : 'border-transparent opacity-50'}`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('register')}
              className={`font-display text-xl uppercase pb-1 border-b-4 transition-colors ${mode === 'register' ? 'border-ink-red' : 'border-transparent opacity-50'}`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="font-mono font-bold text-xs uppercase block mb-2">Courriel</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="retro-input"
                required
                placeholder=""
              />
            </div>
            <div>
              <label className="font-mono font-bold text-xs uppercase block mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="retro-input"
                required
                placeholder=""
                minLength={6}
              />
            </div>

            {error && (
              <div className="border-2 border-ink-red bg-red-50 p-3 text-ink-red font-mono text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="retro-btn bg-ink-black text-paper hover:bg-ink-red mt-2"
            >
              {loading ? 'Traitement...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
