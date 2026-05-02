import { Medication } from '../types';
import { isRecurrenceMatch, getNextRecurrenceDate } from './recurrence';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isMedicationDueOnDate(medication: Medication, dateStr: string): boolean {
  const origin = new Date(medication.start_date + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');

  if (target < origin) return false;

  if (medication.end_date) {
    const end = new Date(medication.end_date + 'T00:00:00');
    if (target > end) return false;
  }

  if (target.getTime() === origin.getTime()) return true;

  if (medication.recurrence) {
    return isRecurrenceMatch(origin, medication.recurrence, target);
  }

  if (!medication.recurrence_interval || medication.recurrence_type === 'none') {
    return false;
  }

  const diffDays = Math.round((target.getTime() - origin.getTime()) / 86400000);
  return diffDays > 0 && diffDays % medication.recurrence_interval === 0;
}

export function getNextMedicationOccurrenceDate(medication: Medication, currentDate: string): string | null {
  if (medication.recurrence) {
    return getNextRecurrenceDate(currentDate, medication.recurrence);
  }

  if (!medication.recurrence_interval || medication.recurrence_type === 'none') {
    return null;
  }

  return addDays(currentDate, medication.recurrence_interval);
}
