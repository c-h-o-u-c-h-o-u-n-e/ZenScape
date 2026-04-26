import { RecurrenceRule } from '../types';

export function isRecurrenceMatch(origin: Date, rule: RecurrenceRule, date: Date): boolean {
  if (date <= origin) return false;
  if (rule.end_date) {
    const end = new Date(rule.end_date + 'T00:00:00');
    if (date > end) return false;
  }
  switch (rule.freq) {
    case 'daily':   return dailyMatch(origin, rule.interval, rule.weekdays_only ?? false, date);
    case 'weekly':  return weeklyMatch(origin, rule.interval, rule.days ?? [], date);
    case 'monthly': return monthlyMatch(origin, rule.interval, rule, date);
    case 'yearly':  return yearlyMatch(origin, rule.interval, rule, date);
  }
}

function dailyMatch(origin: Date, interval: number, weekdaysOnly: boolean, date: Date): boolean {
  if (weekdaysOnly) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return false;
    let count = 0;
    const cur = new Date(origin);
    cur.setDate(cur.getDate() + 1);
    while (cur <= date) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count > 0 && count % interval === 0;
  }
  const diff = Math.round((date.getTime() - origin.getTime()) / 86400000);
  return diff % interval === 0;
}

function getMonday(d: Date): Date {
  const day = new Date(d);
  const dow = day.getDay();
  day.setDate(day.getDate() + (dow === 0 ? -6 : 1 - dow));
  return day;
}

function weeklyMatch(origin: Date, interval: number, days: number[], date: Date): boolean {
  if (days.length > 0 && !days.includes(date.getDay())) return false;
  const weeksDiff = Math.round((getMonday(date).getTime() - getMonday(origin).getTime()) / (7 * 86400000));
  return weeksDiff >= 0 && weeksDiff % interval === 0;
}

function monthlyMatch(origin: Date, interval: number, rule: RecurrenceRule, date: Date): boolean {
  const monthsDiff = (date.getFullYear() - origin.getFullYear()) * 12 + (date.getMonth() - origin.getMonth());
  if (monthsDiff <= 0 || monthsDiff % interval !== 0) return false;
  if (rule.mode === 'position' && rule.position !== undefined && rule.weekday !== undefined) {
    return nthWeekdayOfMonth(date, rule.position, rule.weekday);
  }
  const targetDay = rule.day ?? origin.getDate();
  if (targetDay === -1) return date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === Math.min(targetDay, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate());
}

function yearlyMatch(origin: Date, interval: number, rule: RecurrenceRule, date: Date): boolean {
  const yearsDiff = date.getFullYear() - origin.getFullYear();
  if (yearsDiff <= 0 || yearsDiff % interval !== 0) return false;
  if (rule.month !== undefined && date.getMonth() !== rule.month) return false;
  if (rule.mode === 'position' && rule.position !== undefined && rule.weekday !== undefined) {
    return nthWeekdayOfMonth(date, rule.position, rule.weekday);
  }
  return date.getDate() === (rule.day ?? origin.getDate());
}

function nthWeekdayOfMonth(date: Date, position: number, weekday: number): boolean {
  if (date.getDay() !== weekday) return false;
  const y = date.getFullYear(), m = date.getMonth(), dom = date.getDate();
  if (position === -1) return new Date(y, m, dom + 7).getMonth() !== m;
  let count = 0;
  for (let d = 1; d <= dom; d++) {
    if (new Date(y, m, d).getDay() === weekday) count++;
  }
  return count === position;
}

export function getNextRecurrenceDate(originDate: string, rule: RecurrenceRule): string | null {
  const origin = new Date(originDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextDate = new Date(origin);

  switch (rule.freq) {
    case 'daily': {
      if (rule.weekdays_only) {
        do {
          nextDate.setDate(nextDate.getDate() + 1);
        } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
      } else {
        nextDate.setDate(nextDate.getDate() + (rule.interval || 1));
      }
      break;
    }
    case 'weekly': {
      nextDate.setDate(nextDate.getDate() + 7 * (rule.interval || 1));
      break;
    }
    case 'monthly': {
      nextDate.setMonth(nextDate.getMonth() + (rule.interval || 1));
      if (rule.mode === 'position' && rule.position !== undefined && rule.weekday !== undefined) {
        nextDate = getNthWeekday(nextDate.getFullYear(), nextDate.getMonth(), rule.position, rule.weekday);
      } else {
        const targetDay = rule.day ?? origin.getDate();
        if (targetDay === -1) {
          nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
        } else {
          const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(targetDay, maxDay));
        }
      }
      break;
    }
    case 'yearly': {
      nextDate.setFullYear(nextDate.getFullYear() + (rule.interval || 1));
      if (rule.mode === 'position' && rule.position !== undefined && rule.weekday !== undefined) {
        nextDate = getNthWeekday(nextDate.getFullYear(), rule.month ?? 0, rule.position, rule.weekday);
      } else {
        nextDate.setMonth(rule.month ?? origin.getMonth());
      }
      break;
    }
  }

  if (rule.end_date) {
    const endDate = new Date(rule.end_date + 'T00:00:00');
    if (nextDate > endDate) return null;
  }

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNthWeekday(year: number, month: number, position: number, weekday: number): Date {
  let date = new Date(year, month, 1);
  let count = 0;

  if (position === -1) {
    date = new Date(year, month + 1, 0);
    while (date.getDay() !== weekday && date.getMonth() === month) {
      date.setDate(date.getDate() - 1);
    }
    return date;
  }

  while (date.getMonth() === month && count < position) {
    if (date.getDay() === weekday) count++;
    if (count === position) break;
    date.setDate(date.getDate() + 1);
  }

  return date;
}

const WD = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MO = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const POS: Record<number, string> = { 1: '1er', 2: '2e', 3: '3e', 4: '4e', [-1]: 'dernier' };

export function recurrenceLabel(rule: RecurrenceRule): string {
  const suffix = rule.end_date ? ` → ${rule.end_date}` : '';
  switch (rule.freq) {
    case 'daily': {
      const base = rule.weekdays_only
        ? (rule.interval === 1 ? 'Chaque jour ouvrable' : `Tous les ${rule.interval} jours ouvrables`)
        : (rule.interval === 1 ? 'Tous les jours' : `Tous les ${rule.interval} jours`);
      return base + suffix;
    }
    case 'weekly': {
      const days = (rule.days ?? []).map(d => WD[d]).join(', ');
      return (rule.interval === 1 ? `Chaque ${days || 'semaine'}` : `Toutes les ${rule.interval} sem. (${days})`) + suffix;
    }
    case 'monthly': {
      const base = rule.mode === 'position'
        ? (rule.interval === 1 ? `${POS[rule.position!] ?? rule.position + 'e'} ${WD[rule.weekday!]} du mois` : `${POS[rule.position!]} ${WD[rule.weekday!]} tous les ${rule.interval} mois`)
        : (rule.interval === 1 ? `Chaque mois le ${rule.day === -1 ? 'dernier jour' : rule.day}` : `Tous les ${rule.interval} mois le ${rule.day === -1 ? 'dernier jour' : rule.day}`);
      return base + suffix;
    }
    case 'yearly': {
      const mo = MO[rule.month ?? 0];
      const base = rule.mode === 'position'
        ? (rule.interval === 1 ? `${POS[rule.position!]} ${WD[rule.weekday!]} de ${mo}` : `${POS[rule.position!]} ${WD[rule.weekday!]} de ${mo} tous les ${rule.interval} ans`)
        : (rule.interval === 1 ? `Chaque ${mo} le ${rule.day}` : `Tous les ${rule.interval} ans en ${mo} le ${rule.day}`);
      return base + suffix;
    }
  }
}
