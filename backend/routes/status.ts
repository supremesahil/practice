import { Elysia, t } from 'elysia';
import { getDataMode } from '../db/supabase';
import { updateDoseStatus } from '../services/reminderService';

export const statusRoutes = new Elysia({ prefix: '/api/status' }).post(
  '/update',
  async ({ body, set }) => {
    try {
      const result = await updateDoseStatus(body);

      return {
        success: true,
        message: 'Dose status updated successfully',
        mode: getDataMode(),
        data: result
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update status'
      };
    }
  },
  {
    body: t.Object({
      userId: t.String({ minLength: 1 }),
      phone: t.Optional(t.String()),
      status: t.Union([t.Literal('taken'), t.Literal('later'), t.Literal('skip')]),
      timestamp: t.Optional(t.String())
    })
  }
);
