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
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
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
  start_date: string;
  end_date: string | null;
  notes: string | null;
  take_with_food: boolean;
  recurrence_type: RecurrenceType;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence: RecurrenceRule | null;
  created_at: string;
  updated_at: string;
}

export interface Filters {
  goalId: string | null;
  status: TaskStatus | null;
  priority: TaskPriority[] | null;
  tags: string[] | null;
  dateFrom: string | null;
  dateTo: string | null;
}
