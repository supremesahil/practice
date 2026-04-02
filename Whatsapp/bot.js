import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { handleIncomingMessage } from './messageHandler.js';
import { createPatientState, createScheduler } from './scheduler.js';

const AUTH_DIR = process.env.WA_AUTH_DIR ?? '../auth';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'silent' });

const patientState = createPatientState();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    browser: ['Remote Care Companion', 'Chrome', '1.0.0']
  });

  const scheduler = createScheduler({ sock, patientState });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('[bot] Scan the QR code above to connect WhatsApp.');
    }

    if (connection === 'open') {
      console.log('[bot] WhatsApp bot is connected.');
      scheduler.start();
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      scheduler.stop();
      console.log(`[bot] Connection closed. Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        await startBot();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') {
      return;
    }

    for (const message of messages) {
      await handleIncomingMessage({
        sock,
        baileysMessage: message,
        patientState,
        markUserReplied: scheduler.markUserReplied,
        scheduleSnoozeReminder: scheduler.scheduleSnoozeReminder
      });
    }
  });
}

startBot().catch((error) => {
  console.error('[bot] Failed to start:', error);
  process.exit(1);
});
