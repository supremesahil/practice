export type ReminderStatus = 'taken' | 'later' | 'skip';
export type AlertType = 'sos' | 'missed' | 'inactivity';
export type BurnoutLevel = 'low' | 'medium' | 'high';
export type DataMode = 'supabase' | 'mock';

export interface User {
  id: string;
  phone: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  medicine: string;
  time: string;
  dosage: string;
  quantity: number;
}

export interface LogEntry {
  id: string;
  user_id: string;
  status: ReminderStatus;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
}

export interface AddReminderInput {
  userId: string;
  phone?: string;
  medicine: string;
  time: string;
  dosage: string;
  quantity: number;
}

export interface UpdateStatusInput {
  userId: string;
  phone?: string;
  status: ReminderStatus;
  timestamp?: string;
}

export interface SosInput {
  userId: string;
  phone?: string;
  message?: string;
}

export interface BurnoutInput {
  userId?: string;
  mood: string;
}

export type ReminderInsert = Omit<Reminder, 'id'>;
export type LogEntryInsert = Omit<LogEntry, 'id'>;
export type AlertInsert = Omit<Alert, 'id'>;
