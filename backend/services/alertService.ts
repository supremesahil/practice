import { insertAlertEntry } from '../db/supabase';
import { emitAlert, emitSosTriggered } from '../socket/socket';
import type { Alert, AlertType } from '../types';

export const createAlert = async (type: AlertType, message: string): Promise<Alert> => {
  const alert = await insertAlertEntry({
    type,
    message,
    timestamp: new Date().toISOString()
  });

  // Every alert is pushed to the frontend in real time.
  emitAlert(alert);

  if (type === 'sos') {
    emitSosTriggered(alert);
  }

  return alert;
};
