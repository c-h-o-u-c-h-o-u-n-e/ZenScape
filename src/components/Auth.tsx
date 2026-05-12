import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useErrorToast } from './ErrorToastProvider';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showError } = useErrorToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) showError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) showError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <img
          src="/images/logo.png"
          alt="TaskFlow"
          className="mx-auto mb-8 w-full max-w-xs"
        />

        <div className="retro-card p-8">
          <div className="flex justify-center gap-12 mb-8 border-b-4 border-ink-black pb-4">
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
              <label htmlFor="auth-email" className="font-mono font-bold text-xs uppercase block mb-2">Courriel</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="retro-input"
                required
                placeholder=""
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="font-mono font-bold text-xs uppercase block mb-2">Mot de passe</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="retro-input"
                required
                placeholder=""
                minLength={6}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="retro-btn bg-ink-blue text-paper hover:bg-ink-blue mt-2"
            >
              {loading ? 'Connexion en cours...' : mode === 'login' ? 'Me connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
