export type GoalStatus = 'active' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'custom';

// Rich recurrence rule stored in the `recurrence` JSONB column (auto-populated by DB trigger)
export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  weekdays_only?: boolean;
  days?: number[];
  mode?: 'date' | 'position';
  day?: number;
  position?: number;
  weekday?: number;
  month?: number;
  end_date?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  status: GoalStatus;
  start_date: string | null;
  end_date: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  notes: string | null;
  location: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  start_date: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  position: number;
  archived: boolean;
  recurrence_type: RecurrenceType;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence: RecurrenceRule | null;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string;
  format: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  take_with_food: boolean;
  recurrence_type: RecurrenceType;
  recurrence_interval: number | null;
  recurrence_times: string | null;
  recurrence_end_date: string | null;
  recurrence: RecurrenceRule | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationIntake {
  id: string;
  user_id: string;
  medication_id: string;
  status: 'taken' | 'missed';
  intake_date: string;
  created_at: string;
}

// User Profile types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// User Preferences types
export type TimeFormatPreference = '24h' | '12h';
export type WeekStartPreference = 'monday' | 'sunday';
export type TimezonePreference = string;
export type FontPreference =
  | 'kg-dark-side'
  | 'poppins'
  | 'quicksand'
  | 'saira';

export interface UserPreferences {
  id: string;
  user_id: string;
  timeFormat: TimeFormatPreference;
  weekStartsOn: WeekStartPreference;
  timezone: TimezonePreference;
  weatherCity: string;
  weatherLatitude?: number | null;
  weatherLongitude?: number | null;
  fontFamily: FontPreference;
  searchIncludeArchivedTasks: boolean;
  archiveModalApplyTagFilters: boolean;
  autoArchiveCompletedTasksAtMidnight: boolean;
  created_at: string;
  updated_at: string;
}

export interface Filters {
  goalId: string | null;
  goalIds?: string[];
  search: string;
  status: TaskStatus | null;
  priority: TaskPriority[] | null;
  tags: string[] | null;
  dateFrom: string | null;
  dateTo: string | null;
}
