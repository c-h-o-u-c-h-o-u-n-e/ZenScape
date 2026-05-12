import { useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Mail, Calendar, User as UserIcon } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { useErrorToast } from './ErrorToastProvider';
import {
  TimeFormatPreference,
  TimezonePreference,
  WeekStartPreference,
  useUserPreferences,
} from '../lib/userPreferences';
import Dropdown, { DropdownOption } from './Dropdown';
import ModalCloseButton from './ModalCloseButton';

interface Props {
  user: User;
  onClose: () => void;
}

type ProfileTab = 'profile' | 'preferences';

export default function ProfileModal({ user, onClose }: Props) {
  const { showError } = useErrorToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  const timezoneOptions: DropdownOption[] = [
    { value: '-12', label: 'Baker Island (Îles Baker)', rightLabel: 'UTC-12' },
    { value: '-11', label: 'Pago Pago (Samoa Américaine)', rightLabel: 'UTC-11' },
    { value: '-10', label: 'Honolulu (Hawaï)', rightLabel: 'UTC-10' },
    { value: '-9', label: 'Anchorage (Alaska)', rightLabel: 'UTC-9' },
    { value: '-8', label: 'Los Angeles (Californie)', rightLabel: 'UTC-8' },
    { value: '-7', label: 'Denver (Colorado)', rightLabel: 'UTC-7' },
    { value: '-6', label: 'Chicago (Illinois)', rightLabel: 'UTC-6' },
    { value: '-5', label: 'New York (États-Unis)', rightLabel: 'UTC-5' },
    { value: '-4', label: 'Caracas (Venezuela) / Halifax', rightLabel: 'UTC-4' },
    { value: '-3', label: 'Buenos Aires (Argentine)', rightLabel: 'UTC-3' },
    { value: '-2', label: 'Noronha (Brésil)', rightLabel: 'UTC-2' },
    { value: '-1', label: 'Açores (Portugal)', rightLabel: 'UTC-1' },
    { value: '0', label: 'Londres (Royaume-Uni) / Dublin', rightLabel: 'UTC+0' },
    { value: '1', label: 'Paris (France) / Berlin', rightLabel: 'UTC+1' },
    { value: '2', label: 'Le Caire (Égypte) / Athènes', rightLabel: 'UTC+2' },
    { value: '3', label: 'Moscou (Russie) / Nairobi', rightLabel: 'UTC+3' },
    { value: '4', label: 'Dubaï (Émirats)', rightLabel: 'UTC+4' },
    { value: '5', label: 'Karachi (Pakistan)', rightLabel: 'UTC+5' },
    { value: '6', label: 'Dhaka (Bangladesh)', rightLabel: 'UTC+6' },
    { value: '7', label: 'Bangkok (Thaïlande) / Jakarta', rightLabel: 'UTC+7' },
    { value: '8', label: 'Pékin / Shanghai (Chine) / Singapour', rightLabel: 'UTC+8' },
    { value: '9', label: 'Tokyo (Japon) / Séoul', rightLabel: 'UTC+9' },
    { value: '10', label: 'Sydney (Australie)', rightLabel: 'UTC+10' },
    { value: '11', label: 'Vladivostok (Russie)', rightLabel: 'UTC+11' },
    { value: '12', label: 'Auckland (Nouvelle-Zélande)', rightLabel: 'UTC+12' },
    { value: '13', label: 'Nuku\'alofa (Tonga)', rightLabel: 'UTC+13' },
    { value: '14', label: 'Kiritimati (Kiribati)', rightLabel: 'UTC+14' },
  ];

  const [preferences, setPreferences] = useUserPreferences(user.id);
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

  const updateTimeFormat = (timeFormat: TimeFormatPreference) => {
    setPreferences({ ...preferences, timeFormat });
  };

  const updateWeekStart = (weekStartsOn: WeekStartPreference) => {
    setPreferences({ ...preferences, weekStartsOn });
  };

  const updateTimezone = (timezone: TimezonePreference) => {
    setPreferences({ ...preferences, timezone });
  };

  const updateSearchIncludeArchivedTasks = (searchIncludeArchivedTasks: boolean) => {
    setPreferences({ ...preferences, searchIncludeArchivedTasks });
  };

  const updateArchiveModalApplyTagFilters = (archiveModalApplyTagFilters: boolean) => {
    setPreferences({ ...preferences, archiveModalApplyTagFilters });
  };

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
          className="relative z-20 p-6 space-y-5 overflow-visible flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--theme-surface)' }}
        >
          <div className="grid grid-cols-2 gap-2 mb-9">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`retro-btn py-3 text-sm transition-colors ${activeTab === 'profile' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
            >
              Détails du profil
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`retro-btn py-3 text-sm transition-colors ${activeTab === 'preferences' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
            >
              Préférences
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-10">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-ink-black">
                  <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                  <p className="text-[14px] uppercase font-bold whitespace-nowrap">Informations du profil</p>
                  <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                </div>

                <div className="grid gap-4 text-xs">
                  <div className="flex items-start gap-2">
                    <UserIcon size={14} className="flex-shrink-0" />
                    <div>
                      <p className="text-[10px] mb-1 uppercase font-bold opacity-70">Nom d'utilisateur</p>
                      <p className="text-sm font-bold">{displayName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Mail size={14} className="text-ink-red flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] mb-1 uppercase font-bold opacity-70">Courriel</p>
                      <p className="font-mono break-all">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-ink-blue flex-shrink-0" />
                    <div>
                      <p className="text-[10px] mb-1 uppercase font-bold opacity-70">Membre depuis</p>
                      <p className="font-bold">{createdDate}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-ink-black">
                  <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                  <p className="text-[14px] uppercase font-bold whitespace-nowrap">Mot de passe</p>
                  <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="font-mono font-bold text-[10px] uppercase block mb-1.5">Nouveau mot de passe</label>
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
                    <label htmlFor="confirm-password" className="font-mono font-bold text-[10px] uppercase block mb-1.5">Confirmer le mot de passe</label>
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
                    <p className="text-[11px] font-bold text-ink-green">{passwordSuccessMessage}</p>
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
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-ink-black">
                  <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                  <p className="text-[14px] uppercase font-bold whitespace-nowrap">Date et heure</p>
                  <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="font-mono font-bold text-[10px] whitespace-nowrap">Mon fuseau horaire</label>
                  <div className="flex-1">
                    <Dropdown
                      value={preferences.timezone}
                      onChange={v => updateTimezone(v as TimezonePreference)}
                      options={timezoneOptions}
                      placeholder="Choisir un fuseau horaire"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold whitespace-nowrap">Format de l'heure affiché</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateTimeFormat('12h')}
                      className={`retro-btn text-xs px-3 py-1.5 transition-colors ${preferences.timeFormat === '12h' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                    >
                      12 heures
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTimeFormat('24h')}
                      className={`retro-btn text-xs px-3 py-1.5 transition-colors ${preferences.timeFormat === '24h' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                    >
                      24 heures
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold whitespace-nowrap">La semaine débute le</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateWeekStart('sunday')}
                      className={`retro-btn text-xs px-3 py-1.5 transition-colors ${preferences.weekStartsOn === 'sunday' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                    >
                      Dimanche
                    </button>
                    <button
                      type="button"
                      onClick={() => updateWeekStart('monday')}
                      className={`retro-btn text-xs px-3 py-1.5 transition-colors ${preferences.weekStartsOn === 'monday' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                    >
                      Lundi
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-ink-black">
                  <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                  <p className="text-[14px] uppercase font-bold whitespace-nowrap">Affichage</p>
                  <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold">Les résultats de recherche incluent les tâches archivées.</span>
                  <input
                    id="search-include-archived"
                    name="searchIncludeArchivedTasks"
                    type="checkbox"
                    checked={preferences.searchIncludeArchivedTasks}
                    onChange={(e) => updateSearchIncludeArchivedTasks(e.target.checked)}
                    className="retro-checkbox w-5 h-5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold">Les filtres et les tags actifs affectent les tâches archivées</span>
                  <input
                    id="archive-apply-filters"
                    name="archiveModalApplyTagFilters"
                    type="checkbox"
                    checked={preferences.archiveModalApplyTagFilters}
                    onChange={(e) => updateArchiveModalApplyTagFilters(e.target.checked)}
                    className="retro-checkbox w-5 h-5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2" style={{ backgroundColor: 'var(--theme-surface)' }}>
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
