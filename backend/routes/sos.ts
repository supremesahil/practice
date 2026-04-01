import { Elysia, t } from 'elysia';
import { getDataMode } from '../db/supabase';
import { ensureUserRecord } from '../db/supabase';
import { createAlert } from '../services/alertService';

export const sosRoutes = new Elysia({ prefix: '/api' }).post(
  '/sos',
  async ({ body, set }) => {
    try {
      await ensureUserRecord(body.userId, body.phone);

      const alert = await createAlert(
        'sos',
        body.message?.trim() || `SOS triggered by user ${body.userId}`
      );

      set.status = 201;
      return {
        success: true,
        message: 'SOS alert created successfully',
        mode: getDataMode(),
        data: { alert }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create SOS alert'
      };
    }
  },
  {
    body: t.Object({
      userId: t.String({ minLength: 1 }),
      phone: t.Optional(t.String()),
      message: t.Optional(t.String())
    }),
    detail: {
      summary: 'Trigger an SOS alert',
      description: 'Creates an SOS alert and emits real-time alert events to connected clients.',
      tags: ['Alerts']
    }
  }
);
