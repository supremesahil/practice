import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Alert,
  AlertInsert,
  DataMode,
  LogEntry,
  LogEntryInsert,
  Reminder,
  ReminderInsert,
  User
} from '../types';

const supabaseUrl = Bun.env.SUPABASE_URL;
const supabaseAnonKey = Bun.env.SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const runtimeState = {
  usingMock: !supabase,
  note: !supabase
    ? 'Supabase credentials missing. Running in in-memory demo mode.'
    : 'Supabase mode enabled.'
};

const mockDb = {
  users: [] as User[],
  reminders: [] as Reminder[],
  logs: [] as LogEntry[],
  alerts: [] as Alert[]
};

const createId = () => crypto.randomUUID();

const demoPhoneForUser = (userId: string) => {
  const compactId = userId.replaceAll('-', '').slice(0, 10);
  return `+91${compactId.padEnd(10, '0')}`;
};

const switchToMockMode = (reason: string) => {
  runtimeState.usingMock = true;
  runtimeState.note = `${reason}. Falling back to in-memory demo mode.`;
  console.warn(`[db] ${runtimeState.note}`);
};

const runWithFallback = async <T>(
  label: string,
  supabaseOperation: () => Promise<T>,
  mockOperation: () => Promise<T> | T
): Promise<T> => {
  if (!supabase || runtimeState.usingMock) {
    return await mockOperation();
  }

  try {
    return await supabaseOperation();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    switchToMockMode(`${label} failed: ${message}`);
    return await mockOperation();
  }
};

export const getDataMode = (): DataMode => (runtimeState.usingMock ? 'mock' : 'supabase');

export const getRuntimeNote = (): string => runtimeState.note;

export const ensureUserRecord = async (userId: string, phone?: string): Promise<void> =>
  runWithFallback(
    'ensureUserRecord',
    async () => {
      const { error } = await supabase!.from('users').upsert({
        id: userId,
        phone: phone ?? demoPhoneForUser(userId)
      });

      if (error) {
        throw error;
      }
    },
    async () => {
      const existingUser = mockDb.users.find((user) => user.id === userId);

      if (existingUser) {
        if (phone) {
          existingUser.phone = phone;
        }

        return;
      }

      mockDb.users.push({
        id: userId,
        phone: phone ?? demoPhoneForUser(userId)
      });
    }
  );

export const insertReminder = async (payload: ReminderInsert): Promise<Reminder> =>
  runWithFallback(
    'insertReminder',
    async () => {
      const { data, error } = await supabase!.from('reminders').insert(payload).select().single();

      if (error) {
        throw error;
      }

      return data as Reminder;
    },
    async () => {
      const reminder: Reminder = {
        id: createId(),
        ...payload
      };

      mockDb.reminders.push(reminder);
      return reminder;
    }
  );

export const listRemindersByUser = async (userId: string): Promise<Reminder[]> =>
  runWithFallback(
    'listRemindersByUser',
    async () => {
      const { data, error } = await supabase!
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('time', { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as Reminder[];
    },
    async () =>
      mockDb.reminders
        .filter((reminder) => reminder.user_id === userId)
        .sort((left, right) => left.time.localeCompare(right.time))
  );

export const insertLogEntry = async (payload: LogEntryInsert): Promise<LogEntry> =>
  runWithFallback(
    'insertLogEntry',
    async () => {
      const { data, error } = await supabase!.from('logs').insert(payload).select().single();

      if (error) {
        throw error;
      }

      return data as LogEntry;
    },
    async () => {
      const logEntry: LogEntry = {
        id: createId(),
        ...payload
      };

      mockDb.logs.push(logEntry);
      return logEntry;
    }
  );

export const insertAlertEntry = async (payload: AlertInsert): Promise<Alert> =>
  runWithFallback(
    'insertAlertEntry',
    async () => {
      const { data, error } = await supabase!.from('alerts').insert(payload).select().single();

      if (error) {
        throw error;
      }

      return data as Alert;
    },
    async () => {
      const alert: Alert = {
        id: createId(),
        ...payload
      };

      mockDb.alerts.push(alert);
      return alert;
    }
  );
