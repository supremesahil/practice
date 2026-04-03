import { cors } from '@elysiajs/cors';
import { Elysia, t } from 'elysia';
import { getDataMode, getRuntimeNote } from '../../db/supabase';
import { burnoutRoutes } from '../../routes/burnout';
import { reminderRoutes } from '../../routes/reminder';
import { sosRoutes } from '../../routes/sos';
import { statusRoutes } from '../../routes/status';
import { handleVoiceQuery } from '../../../gemini-module/controllers/voiceController';

const port = Number(Bun.env.PORT ?? 3000);
const socketPort = Number(Bun.env.SOCKET_PORT ?? 3001);

const voiceRoutes = new Elysia({ prefix: '/api/voice' }).post(
  '/query',
  async ({ body, set }) => {
    try {
      const { userId, query, reminders } = body;

      if (!userId || !query) {
        set.status = 400;
        return {
          success: false,
          text: 'Missing userId or query field'
        };
      }

      return await handleVoiceQuery(
        { userId, query },
        reminders || []
      );
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        text: error instanceof Error ? error.message : 'Query processing failed'
      };
    }
  },
  {
    body: t.Object({
      userId: t.String(),
      query: t.String(),
      reminders: t.Optional(
        t.Array(
          t.Object({
            medicine: t.String(),
            dosage: t.String(),
            time: t.String(),
            quantity: t.Number()
          })
        )
      )
    })
  }
);

export const createTestApp = () =>
  new Elysia()
    .use(
      cors({
        origin: true
      })
    )
    .get('/', () => ({
      success: true,
      message: 'Remote Care Companion backend is running',
      data: {
        httpPort: port,
        socketPort,
        mode: getDataMode(),
        note: getRuntimeNote()
      }
    }))
    .use(reminderRoutes)
    .use(statusRoutes)
    .use(sosRoutes)
    .use(burnoutRoutes)
    .use(voiceRoutes)
    .onError(({ code, error, set }) => {
      const message = error instanceof Error ? error.message : 'Request failed';

      if (code === 'VALIDATION') {
        set.status = 400;
        return {
          success: false,
          message
        };
      }

      set.status = 500;
      return {
        success: false,
        message
      };
    });