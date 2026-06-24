import { useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Mail, Calendar, User as UserIcon } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { useErrorToast } from './ErrorToastProvider';
import ModalCloseButton from './ModalCloseButton';

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const { showError } = useErrorToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');

  const displayName = useMemo(() => {
    const emailPrefix = user.email?.split('@')[0] ?? '';
    return emailPrefix
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Utilisateur';
  }, [user.email]);

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Non disponible';

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMessage('');

    if (newPassword.length < 6) {
      showError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);

    if (error) {
      showError(error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccessMessage('Mot de passe modifié avec succès.');
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col scrollbar-hide"
        style={{
          transform: 'translateX(0)',
          borderLeft: '4px solid #1a1a1a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper shrink-0">
          <h2 className="font-display text-lg uppercase">Profil utilisateur</h2>
          <ModalCloseButton onClose={onClose} className="text-paper p-1" />
        </div>

        {/* Content */}
        <div
          className="relative z-20 p-6 space-y-10 overflow-visible flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--theme-surface)' }}
        >
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-ink-black">
              <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
              <p className="text-md uppercase font-bold whitespace-nowrap">Informations du profil</p>
              <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
            </div>

            <div className="grid gap-4 text-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <UserIcon size={14} className="flex-shrink-0" />
                  <div>
                    <p className="text-xs mb-1 uppercase font-bold opacity-70">Nom d'utilisateur</p>
                    <p className="text-sm font-bold">{displayName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-right">
                  <Calendar size={14} className="text-ink-blue flex-shrink-0" />
                  <div>
                    <p className="text-xs mb-1 uppercase font-bold opacity-70">Membre depuis</p>
                    <p className="text-sm font-bold">{createdDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail size={14} className="text-ink-red flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs mb-1 uppercase font-bold opacity-70">Courriel</p>
                  <p className="text-sm font-mono break-all">{user.email}</p>
                </div>
              </div>

            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-ink-black">
              <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
              <p className="text-md uppercase font-bold whitespace-nowrap">Mot de passe</p>
              <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="font-mono font-bold text-xs uppercase block mb-1.5">Nouveau mot de passe</label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="retro-input"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="font-mono font-bold text-xs uppercase block mb-1.5">Confirmer le mot de passe</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="retro-input"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>

              {passwordSuccessMessage && (
                <p className="text-xs font-bold text-ink-green">{passwordSuccessMessage}</p>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="retro-btn py-2.5 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
                >
                  {isUpdatingPassword ? 'Mise à jour...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-6 border-t-4 border-ink-black" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onClose}
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
