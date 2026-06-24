import { useEffect, useState } from 'react';
import { 
  UserPreferences, 
  TimeFormatPreference, 
  WeekStartPreference, 
  TimezonePreference, 
  FontPreference 
} from '../types';

// Interface pour les préférences sans les champs de base de données
export interface UserPreferencesData {
  timeFormat: TimeFormatPreference;
  weekStartsOn: WeekStartPreference;
  timezone: TimezonePreference;
  weatherCity: string;
  weatherLatitude: number | null;
  weatherLongitude: number | null;
  fontFamily: FontPreference;
  searchIncludeArchivedTasks: boolean;
  archiveModalApplyTagFilters: boolean;
  autoArchiveCompletedTasksAtMidnight: boolean;
}

const DEFAULT_PREFERENCES: UserPreferencesData = {
  timeFormat: '24h',
  weekStartsOn: 'monday',
  timezone: 'UTC',
  weatherCity: 'Montréal',
  weatherLatitude: null,
  weatherLongitude: null,
  fontFamily: 'kg-dark-side',
  searchIncludeArchivedTasks: false,
  archiveModalApplyTagFilters: false,
  autoArchiveCompletedTasksAtMidnight: false,
};

const PREFERENCES_EVENT = 'zenscape-preferences-changed';

function normalizeTimezonePreference(timezone: string | undefined): TimezonePreference {
  const value = (timezone ?? '').trim();
  if (!value) return 'UTC';

  // Backward compatibility with legacy numeric UTC offsets.
  // We map them to representative IANA zones so DST can auto-adjust.
  const legacyOffsetToIana: Record<string, string> = {
    '-12': 'Etc/GMT+12',
    '-11': 'Pacific/Pago_Pago',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/Toronto',
    '-4': 'America/Halifax',
    '-3': 'America/Argentina/Buenos_Aires',
    '-2': 'Etc/GMT+2',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Singapore',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Asia/Vladivostok',
    '12': 'Pacific/Auckland',
    '13': 'Pacific/Tongatapu',
    '14': 'Pacific/Kiritimati',
  };

  if (legacyOffsetToIana[value]) return legacyOffsetToIana[value];
  return value;
}

function keyForUser(userId?: string) {
  return `zenscape.preferences.${userId ?? 'anonymous'}`;
}

export function getUserPreferences(userId?: string): UserPreferencesData {
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    const fallbackRaw = !raw ? localStorage.getItem(keyForUser()) : null;
    if (!raw && !fallbackRaw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw ?? fallbackRaw ?? '{}') as Partial<UserPreferencesData>;
    return {
      timeFormat: parsed.timeFormat === '12h' ? '12h' : '24h',
      weekStartsOn: parsed.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
      timezone: normalizeTimezonePreference(typeof parsed.timezone === 'string' ? parsed.timezone : undefined),
      // Keep empty string if user clears the field, so typing/deleting stays fluid in inputs.
      // We only fallback to Montréal when the value is missing (undefined/non-string).
      weatherCity: typeof parsed.weatherCity === 'string'
        ? parsed.weatherCity
        : 'Montréal',
      weatherLatitude: typeof parsed.weatherLatitude === 'number' ? parsed.weatherLatitude : null,
      weatherLongitude: typeof parsed.weatherLongitude === 'number' ? parsed.weatherLongitude : null,
      fontFamily:
        parsed.fontFamily === 'poppins'
        || parsed.fontFamily === 'quicksand'
        || parsed.fontFamily === 'saira'
          ? parsed.fontFamily
          : 'kg-dark-side',
      searchIncludeArchivedTasks: parsed.searchIncludeArchivedTasks === true,
      archiveModalApplyTagFilters: parsed.archiveModalApplyTagFilters === true,
      autoArchiveCompletedTasksAtMidnight: parsed.autoArchiveCompletedTasksAtMidnight === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveUserPreferences(userId: string | undefined, preferences: UserPreferencesData) {
  localStorage.setItem(keyForUser(userId), JSON.stringify(preferences));
  localStorage.setItem(keyForUser(), JSON.stringify(preferences));
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export function useUserPreferences(
  userId?: string,
): [UserPreferencesData, (next: UserPreferencesData | ((prev: UserPreferencesData) => UserPreferencesData)) => void] {
  const [preferences, setPreferences] = useState<UserPreferencesData>(() => getUserPreferences(userId));

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

  const update = (next: UserPreferencesData | ((prev: UserPreferencesData) => UserPreferencesData)) => {
    setPreferences((prev) => {
      const resolved = typeof next === 'function'
        ? (next as (prev: UserPreferencesData) => UserPreferencesData)(prev)
        : next;
      saveUserPreferences(userId, resolved);
      return resolved;
    });
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
