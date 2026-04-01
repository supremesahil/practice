import {
  ensureUserRecord,
  insertLogEntry,
  insertReminder,
  listRemindersByUser
} from '../db/supabase';
import { emitDoseUpdate } from '../socket/socket';
import type { AddReminderInput, Reminder, UpdateStatusInput } from '../types';
import { createAlert } from './alertService';

export const addReminder = async (input: AddReminderInput): Promise<Reminder> => {
  await ensureUserRecord(input.userId, input.phone);

  return insertReminder({
    user_id: input.userId,
    medicine: input.medicine,
    time: input.time,
    dosage: input.dosage,
    quantity: input.quantity
  });
};

export const getRemindersForUser = async (userId: string) => listRemindersByUser(userId);

export const updateDoseStatus = async (input: UpdateStatusInput) => {
  await ensureUserRecord(input.userId, input.phone);

  const log = await insertLogEntry({
    user_id: input.userId,
    status: input.status,
    timestamp: input.timestamp ?? new Date().toISOString()
  });

  // Medicine status changes are broadcast for live UI updates.
  emitDoseUpdate(log);

  let alert = null;

  if (input.status === 'skip') {
    alert = await createAlert(
      'missed',
      `Missed medication detected for user ${input.userId}`
    );
  }

  return { log, alert };
};
