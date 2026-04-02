import cron from 'node-cron';
import { triggerSos } from './api.js';

const DEFAULT_SNOOZE_MINUTES = Number(process.env.REMINDER_SNOOZE_MINUTES ?? 15);
const DEFAULT_SAFETY_WINDOW_HOURS = Number(process.env.SAFETY_WINDOW_HOURS ?? 6);
const DEFAULT_CHECK_INTERVAL_MINUTES = Number(process.env.SAFETY_CHECK_INTERVAL_MINUTES ?? 10);

const demoPatients = [
  {
    jid: process.env.DEMO_PATIENT_JID ?? '918968520989@s.whatsapp.net',
    userId: process.env.DEMO_USER_ID ?? 'demo-user-001',
    phone: process.env.DEMO_PHONE ?? '+918968520989',
    medicine: process.env.DEMO_MEDICINE ?? 'BP medicine',
    cron: process.env.REMINDER_CRON ?? '*/30 * * * *',
    dosage: process.env.DEMO_DOSAGE ?? '1 tablet'
  }
];

function reminderCopy(patient) {
  return `💊 Time to take ${patient.medicine}\nDose: ${patient.dosage}\nReply: taken / later`;
}

function safetyCopy(patient) {
  return `Passive safety alert: no reply received from ${patient.phone} for the last ${DEFAULT_SAFETY_WINDOW_HOURS} hours.`;
}

export function createPatientState() {
  return new Map(
    demoPatients.map((patient) => [
      patient.jid,
      {
        ...patient,
        awaitingReply: false,
        lastReplyAt: Date.now(),
        lastReminderAt: null,
        waitingSinceAt: null,
        lastAlertAt: null,
        snoozeTimer: null
      }
    ])
  );
}

export function createScheduler({ sock, patientState }) {
  const tasks = [];

  async function sendReminder(state, reason = 'scheduled') {
    state.awaitingReply = true;
    state.lastReminderAt = Date.now();
    state.waitingSinceAt = state.lastReminderAt;

    await sock.sendMessage(state.jid, {
      text:
        reason === 'snooze'
          ? `⏰ Gentle follow-up\n${reminderCopy(state)}`
          : reminderCopy(state)
    });
  }

  function markUserReplied(jid) {
    const state = patientState.get(jid);

    if (!state) {
      return;
    }

    state.lastReplyAt = Date.now();
    state.waitingSinceAt = null;

    if (state.snoozeTimer) {
      clearTimeout(state.snoozeTimer);
      state.snoozeTimer = null;
    }
  }

  function scheduleSnoozeReminder(state) {
    if (state.snoozeTimer) {
      clearTimeout(state.snoozeTimer);
    }

    state.snoozeTimer = setTimeout(async () => {
      try {
        await sendReminder(state, 'snooze');
      } catch (error) {
        console.error('[scheduler] Failed to send snoozed reminder:', error);
      }
    }, DEFAULT_SNOOZE_MINUTES * 60 * 1000);
  }

  function startReminderJobs() {
    for (const state of patientState.values()) {
      const task = cron.schedule(state.cron, async () => {
        try {
          await sendReminder(state);
        } catch (error) {
          console.error('[scheduler] Failed to send scheduled reminder:', error);
        }
      });

      tasks.push(task);
    }
  }

  function startSafetyChecks() {
    const task = cron.schedule(`*/${DEFAULT_CHECK_INTERVAL_MINUTES} * * * *`, async () => {
      const now = Date.now();
      const safetyWindowMs = DEFAULT_SAFETY_WINDOW_HOURS * 60 * 60 * 1000;

      for (const state of patientState.values()) {
        const isOverdue =
          state.awaitingReply &&
          state.waitingSinceAt &&
          now - state.waitingSinceAt >= safetyWindowMs;
        const recentlyAlerted = state.lastAlertAt && now - state.lastAlertAt < safetyWindowMs;

        if (!isOverdue || recentlyAlerted) {
          continue;
        }

        try {
          await triggerSos({
            userId: state.userId,
            phone: state.phone,
            message: safetyCopy(state)
          });

          state.lastAlertAt = now;

          await sock.sendMessage(state.jid, {
            text: '🚨 Emergency alert sent'
          });
        } catch (error) {
          console.error('[scheduler] Failed to trigger passive safety alert:', error);
        }
      }
    });

    tasks.push(task);
  }

  return {
    markUserReplied,
    scheduleSnoozeReminder,
    sendReminder,
    start() {
      startReminderJobs();
      startSafetyChecks();
    },
    stop() {
      for (const task of tasks) {
        task.stop();
        task.destroy();
      }

      tasks.length = 0;
    }
  };
}
