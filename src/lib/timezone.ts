import { getUserPreferences } from './userPreferences';

function getCurrentTimezone(): string {
  if (typeof window === 'undefined') return '0';
  return getUserPreferences().timezone;
}

function parseUtcOffsetHours(timezone: string): number | null {
  const n = Number(timezone);
  if (!Number.isNaN(n) && Number.isFinite(n) && n >= -12 && n <= 14) {
    return n;
  }
  return null;
}

function getDateInSelectedTimezone(now: Date, timezone: string): Date {
  const numericOffset = parseUtcOffsetHours(timezone);
  if (numericOffset !== null) {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    return new Date(utcMs + numericOffset * 3_600_000);
  }
  return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
}

export function getEstDate(): Date {
  const timezone = getCurrentTimezone();
  const now = new Date();
  const estTime = getDateInSelectedTimezone(now, timezone);
  return estTime;
}

export function getEstDateString(): string {
  const timezone = getCurrentTimezone();
  const numericOffset = parseUtcOffsetHours(timezone);

  if (numericOffset !== null) {
    const shifted = getDateInSelectedTimezone(new Date(), timezone);
    const y = shifted.getFullYear();
    const m = String(shifted.getMonth() + 1).padStart(2, '0');
    const d = String(shifted.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return getEstDate().toISOString().split('T')[0];
  }

  return `${year}-${month}-${day}`;
}

export function getMsUntilNextEstMidnight(): number {
  const timezone = getCurrentTimezone();
  const now = new Date();
  const estNow = getDateInSelectedTimezone(now, timezone);
  const nextMidnightEst = new Date(estNow);
  nextMidnightEst.setHours(24, 0, 0, 0);

  const ms = nextMidnightEst.getTime() - estNow.getTime();
  return Math.max(ms, 1000);
}
