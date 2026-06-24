import { useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  FontPreference,
  TimeFormatPreference,
  TimezonePreference,
  WeekStartPreference,
} from '../types';
import {
  useUserPreferences,
} from '../lib/userPreferences';
import Dropdown, { DropdownOption } from './Dropdown';
import ModalCloseButton from './ModalCloseButton';
import Checkbox from './Checkbox';

interface Props {
  user: User;
  onClose: () => void;
}

interface GeocodingResult {
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export default function PreferencesModal({ user, onClose }: Props) {
  const weatherInputRef = useRef<HTMLDivElement>(null);
  const weatherCityNormalizedRef = useRef(false);
  const [weatherSuggestions, setWeatherSuggestions] = useState<Array<{ label: string; value: string; latitude: number; longitude: number }>>([]);
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const [weatherInputFocused, setWeatherInputFocused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const getUtcOffsetLabel = (timeZone: string, date: Date): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);

    const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';

    if (timeZoneName === 'GMT') return 'UTC+0';
    return timeZoneName.replace('GMT', 'UTC');
  };

  const timezoneOptions: DropdownOption[] = [
    { value: 'Etc/GMT+12', label: 'Baker Island' },
    { value: 'Pacific/Pago_Pago', label: 'Pago Pago' },
    { value: 'Pacific/Honolulu', label: 'Honolulu' },
    { value: 'America/Anchorage', label: 'Anchorage' },
    { value: 'America/Los_Angeles', label: 'Los Angeles / Vancouver' },
    { value: 'America/Denver', label: 'Denver / Chihuahua' },
    { value: 'America/Chicago', label: 'Chicago / Mexico' },
    { value: 'America/Toronto', label: 'New York / Toronto' },
    { value: 'America/Halifax', label: 'Halifax' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
    { value: 'Etc/GMT+2', label: 'Noronha' },
    { value: 'Atlantic/Azores', label: 'Ponta Delgada' },
    { value: 'Europe/London', label: 'Londres / Dublin' },
    { value: 'Europe/Paris', label: 'Paris / Berlin' },
    { value: 'Europe/Athens', label: 'Le Caire / Athènes' },
    { value: 'Europe/Moscow', label: 'Moscou' },
    { value: 'Asia/Dubai', label: 'Dubaï' },
    { value: 'Asia/Karachi', label: 'Karachi' },
    { value: 'Asia/Dhaka', label: 'Dhaka' },
    { value: 'Asia/Bangkok', label: 'Bangkok / Jakarta' },
    { value: 'Asia/Singapore', label: 'Pékin / Singapour' },
    { value: 'Asia/Tokyo', label: 'Tokyo / Séoul' },
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'Asia/Vladivostok', label: 'Vladivostok' },
    { value: 'Pacific/Auckland', label: 'Auckland' },
    { value: 'Pacific/Tongatapu', label: 'Nukuʻalofa' },
    { value: 'Pacific/Kiritimati', label: 'Kiritimati' },
  ].map((option) => ({
    ...option,
    rightLabel: getUtcOffsetLabel(option.value, now),
  }));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const [preferences, setPreferences] = useUserPreferences(user.id);

  useEffect(() => {
    const query = preferences.weatherCity.trim();
    if (query.length < 2) {
      setWeatherSuggestions([]);
      setWeatherMenuOpen(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=fr&format=json`,
        );
        const json = await res.json();
        const items: Array<{ label: string; value: string; latitude: number; longitude: number }> = (json?.results ?? [])
          .map((r: GeocodingResult) => {
            const city = r?.name;
            const admin = r?.admin1;
            const country = r?.country;
            const latitude = Number(r?.latitude);
            const longitude = Number(r?.longitude);
            if (!city || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
            return {
              label: [city, admin, country].filter(Boolean).join(', '),
              value: city,
              latitude,
              longitude,
            };
          })
          .filter(Boolean) as Array<{ label: string; value: string; latitude: number; longitude: number }>;

        const uniqueMap = new Map<string, { label: string; value: string; latitude: number; longitude: number }>();
        for (const item of items) {
          if (!uniqueMap.has(item.label)) uniqueMap.set(item.label, item);
        }
        const unique = Array.from(uniqueMap.values());
        if (!cancelled) {
          setWeatherSuggestions(unique);

          if (
            !weatherCityNormalizedRef.current
            && !weatherInputFocused
            && preferences.weatherCity.trim().length > 0
            && !preferences.weatherCity.includes(',')
          ) {
            const exactMatch = unique.find(
              (item) => item.value.toLowerCase() === preferences.weatherCity.trim().toLowerCase(),
            );
            if (exactMatch) {
              weatherCityNormalizedRef.current = true;
              setPreferences((prev) => ({
                ...prev,
                weatherCity: exactMatch.label,
                weatherLatitude: exactMatch.latitude,
                weatherLongitude: exactMatch.longitude,
              }));
            }
          }
        }
      } catch {
        if (!cancelled) {
          setWeatherSuggestions([]);
          setWeatherMenuOpen(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [preferences, setPreferences, weatherInputFocused]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (weatherInputRef.current && !weatherInputRef.current.contains(e.target as Node)) {
        setWeatherMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateTimeFormat = (timeFormat: TimeFormatPreference) => {
    setPreferences((prev) => ({ ...prev, timeFormat }));
  };

  const updateWeekStart = (weekStartsOn: WeekStartPreference) => {
    setPreferences((prev) => ({ ...prev, weekStartsOn }));
  };

  const updateTimezone = (timezone: TimezonePreference) => {
    setPreferences((prev) => ({ ...prev, timezone }));
  };

  const updateFontFamily = (fontFamily: FontPreference) => {
    setPreferences((prev) => ({ ...prev, fontFamily }));
  };

  const updateSearchIncludeArchivedTasks = (searchIncludeArchivedTasks: boolean) => {
    setPreferences((prev) => ({ ...prev, searchIncludeArchivedTasks }));
  };

  const updateArchiveModalApplyTagFilters = (archiveModalApplyTagFilters: boolean) => {
    setPreferences((prev) => ({ ...prev, archiveModalApplyTagFilters }));
  };

  const updateAutoArchiveCompletedTasksAtMidnight = (autoArchiveCompletedTasksAtMidnight: boolean) => {
    setPreferences((prev) => ({ ...prev, autoArchiveCompletedTasksAtMidnight }));
  };

  const fontOptions: DropdownOption[] = [
    { value: 'kg-dark-side', label: 'KG Dark Side' },
    { value: 'poppins', label: 'Poppins' },
    { value: 'quicksand', label: 'Quicksand' },
    { value: 'saira', label: 'Saira' },
  ];

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
          <h2 className="font-display text-lg uppercase">Préférences</h2>
          <ModalCloseButton onClose={onClose} className="text-paper p-1" />
        </div>

        {/* Content */}
        <div
          className="relative z-20 p-6 space-y-10 overflow-visible flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--theme-surface)' }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-ink-black">
              <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
              <p className="text-md uppercase font-bold whitespace-nowrap">Apparences</p>
              <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
            </div>

            <div className="flex items-center gap-4">
              <label className="font-mono font-bold text-xs whitespace-nowrap">Police d'écriture</label>
              <div className="w-[200px] max-w-[calc(100%)] ml-auto">
                <Dropdown
                  value={preferences.fontFamily}
                  onChange={v => updateFontFamily(v as FontPreference)}
                  options={fontOptions}
                  placeholder="Sélectionner une police"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-ink-black">
              <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
              <p className="text-md uppercase font-bold whitespace-nowrap">Date et heure</p>
              <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="font-mono font-bold text-xs whitespace-nowrap">Mon fuseau horaire</label>
              <div className="w-[270px] max-w-[calc(100%)] ml-auto">
                <Dropdown
                  value={preferences.timezone}
                  onChange={v => updateTimezone(v as TimezonePreference)}
                  options={timezoneOptions}
                  placeholder="Choisir un fuseau horaire"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="weather-city" className="font-mono font-bold text-xs whitespace-nowrap">Ville météo</label>
              <div ref={weatherInputRef} className="w-[270px] max-w-[calc(100%)] ml-auto relative">
                <input
                  id="weather-city"
                  type="text"
                  value={preferences.weatherCity}
                  onChange={(e) => {
                    setPreferences((prev) => ({
                      ...prev,
                      weatherCity: e.target.value,
                      weatherLatitude: null,
                      weatherLongitude: null,
                    }));
                    if (e.target.value.trim().length >= 2) {
                      setWeatherMenuOpen(true);
                    }
                  }}
                  onFocus={() => {
                    setWeatherInputFocused(true);
                    if (weatherSuggestions.length > 0) setWeatherMenuOpen(true);
                  }}
                  onBlur={() => setWeatherInputFocused(false)}
                  placeholder="Ex: Montréal"
                  className="retro-input w-full"
                  autoComplete="off"
                />

                {weatherMenuOpen && weatherSuggestions.length > 0 && (
                  <div
                    className="absolute z-[120] top-full left-0 right-0 mt-2 bg-paper border-2 border-ink-black overflow-y-auto"
                    style={{
                      boxShadow:
                        '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                      maxHeight: '220px',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    }}
                  >
                    {weatherSuggestions.map((city) => (
                      <button
                        key={city.label}
                        type="button"
                        onClick={() => {
                          setPreferences((prev) => ({
                            ...prev,
                            weatherCity: city.label,
                            weatherLatitude: city.latitude,
                            weatherLongitude: city.longitude,
                          }));
                          setWeatherMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 font-mono text-xs transition-colors duration-75 border-b last:border-b-0 hover:bg-ink-black/8"
                        style={{ borderColor: 'color-mix(in srgb, var(--theme-primary-text) 70%, transparent)' }}
                      >
                        {city.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold whitespace-nowrap">Format de l'heure affiché</span>
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
              <span className="text-xs font-bold whitespace-nowrap">La semaine débute le</span>
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
              <p className="text-md uppercase font-bold whitespace-nowrap">Affichage</p>
              <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Checkbox
                id="search-include-archived"
                checked={preferences.searchIncludeArchivedTasks}
                onChange={updateSearchIncludeArchivedTasks}
                label="Les résultats de recherche incluent les tâches archivées"
                className="w-full justify-between flex-row-reverse"
                labelClassName="text-xs normal-case tracking-normal pt-0"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Checkbox
                id="archive-apply-filters"
                checked={preferences.archiveModalApplyTagFilters}
                onChange={updateArchiveModalApplyTagFilters}
                label="Les filtres et les tags actifs affectent les tâches archivées"
                className="w-full justify-between flex-row-reverse"
                labelClassName="text-xs normal-case tracking-normal pt-0"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-ink-black">
              <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
              <p className="text-md uppercase font-bold whitespace-nowrap">Gestion des données</p>
              <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Checkbox
                id="auto-archive-completed-at-midnight"
                checked={preferences.autoArchiveCompletedTasksAtMidnight}
                onChange={updateAutoArchiveCompletedTasksAtMidnight}
                label="Archiver automatiquement les tâches terminées à minuit"
                className="w-full justify-between flex-row-reverse"
                labelClassName="text-xs normal-case tracking-normal pt-0"
              />
            </div>
          </div>

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