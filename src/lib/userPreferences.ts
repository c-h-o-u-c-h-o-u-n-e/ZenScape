import { useEffect, useState } from 'react';

export type TimeFormatPreference = '24h' | '12h';
export type WeekStartPreference = 'monday' | 'sunday';
export type TimezonePreference = string;

export interface UserPreferences {
  timeFormat: TimeFormatPreference;
  weekStartsOn: WeekStartPreference;
  timezone: TimezonePreference;
  searchIncludeArchivedTasks: boolean;
  archiveModalApplyTagFilters: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  timeFormat: '24h',
  weekStartsOn: 'monday',
  timezone: 'UTC',
  searchIncludeArchivedTasks: false,
  archiveModalApplyTagFilters: false,
};

const PREFERENCES_EVENT = 'zenscape-preferences-changed';

function keyForUser(userId?: string) {
  return `zenscape.preferences.${userId ?? 'anonymous'}`;
}

export function getUserPreferences(userId?: string): UserPreferences {
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    const fallbackRaw = !raw ? localStorage.getItem(keyForUser()) : null;
    if (!raw && !fallbackRaw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw ?? fallbackRaw ?? '{}') as Partial<UserPreferences>;
    return {
      timeFormat: parsed.timeFormat === '12h' ? '12h' : '24h',
      weekStartsOn: parsed.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
      timezone: typeof parsed.timezone === 'string' && parsed.timezone.length > 0
        ? parsed.timezone as TimezonePreference
        : 'UTC',
      searchIncludeArchivedTasks: parsed.searchIncludeArchivedTasks === true,
      archiveModalApplyTagFilters: parsed.archiveModalApplyTagFilters === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveUserPreferences(userId: string | undefined, preferences: UserPreferences) {
  localStorage.setItem(keyForUser(userId), JSON.stringify(preferences));
  localStorage.setItem(keyForUser(), JSON.stringify(preferences));
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export function useUserPreferences(userId?: string): [UserPreferences, (next: UserPreferences) => void] {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getUserPreferences(userId));

  useEffect(() => {
    setPreferences(getUserPreferences(userId));

    const handleUpdate = () => setPreferences(getUserPreferences(userId));
    window.addEventListener(PREFERENCES_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(PREFERENCES_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [userId]);

  const update = (next: UserPreferences) => {
    setPreferences(next);
    saveUserPreferences(userId, next);
  };

  return [preferences, update];
}

export function formatTimeForDisplay(time: string | null | undefined, timeFormat: TimeFormatPreference): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const hours = Number(hStr);
  if (Number.isNaN(hours)) return time.slice(0, 5);

  if (timeFormat === '24h') {
    return `${hours}h${mStr}`;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${mStr} ${suffix}`;
}
