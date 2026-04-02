import { triggerSos, updateStatus } from './api.js';

const VALID_COMMANDS = new Set(['taken', 'later', 'skip', 'sos']);

function normalizeText(message) {
  return message?.trim().toLowerCase() ?? '';
}

function extractText(baileysMessage) {
  if (!baileysMessage?.message) {
    return '';
  }

  const { conversation, extendedTextMessage, imageMessage, videoMessage } = baileysMessage.message;

  return (
    conversation ||
    extendedTextMessage?.text ||
    imageMessage?.caption ||
    videoMessage?.caption ||
    ''
  );
}

function buildContext(jid, text, state) {
  return {
    jid,
    text,
    userId: state.userId,
    phone: state.phone
  };
}

async function sendReply(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

async function handleTaken({ sock, context, state, markUserReplied }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'taken',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  await sendReply(sock, context.jid, '✅ Noted');
}

async function handleLater({ sock, context, state, markUserReplied, scheduleSnoozeReminder }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'later',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = true;
  await sendReply(sock, context.jid, '⏰ Reminder postponed');
  scheduleSnoozeReminder(state);
}

async function handleSkip({ sock, context, state, markUserReplied }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'skip',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  await sendReply(sock, context.jid, '✅ Noted');
}

async function handleSos({ sock, context, state, markUserReplied }) {
  await triggerSos({
    userId: context.userId,
    phone: context.phone,
    message: `Emergency help requested via WhatsApp by ${context.phone}`
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  state.lastAlertAt = Date.now();
  await sendReply(sock, context.jid, '🚨 Emergency alert sent');
}

export async function handleIncomingMessage({
  sock,
  baileysMessage,
  patientState,
  markUserReplied,
  scheduleSnoozeReminder
}) {
  const jid = baileysMessage.key.remoteJid;
  const state = patientState.get(jid);

  if (!jid || !state || baileysMessage.key.fromMe) {
    return;
  }

  const text = normalizeText(extractText(baileysMessage));
  const context = buildContext(jid, text, state);

  if (!VALID_COMMANDS.has(text)) {
    if (state.awaitingReply) {
      await sendReply(
        sock,
        jid,
        '💡 Please reply with: taken / later / skip / sos'
      );
    }
    return;
  }

  try {
    if (text === 'taken') {
      await handleTaken({ sock, context, state, markUserReplied });
      return;
    }

    if (text === 'later') {
      await handleLater({ sock, context, state, markUserReplied, scheduleSnoozeReminder });
      return;
    }

    if (text === 'skip') {
      await handleSkip({ sock, context, state, markUserReplied });
      return;
    }

    await handleSos({ sock, context, state, markUserReplied });
  } catch (error) {
    console.error('[handler] Failed to process incoming message:', error);
    await sendReply(
      sock,
      jid,
      '⚠️ Something went wrong while updating your status. Please try again.'
    );
  }
}
