import { Elysia, t } from 'elysia';
import { getDataMode } from '../db/supabase';
import { addReminder, getRemindersForUser } from '../services/reminderService';

export const reminderRoutes = new Elysia({ prefix: '/api/reminder' })
  .post(
    '/add',
    async ({ body, set }) => {
      try {
        const reminder = await addReminder(body);

        set.status = 201;
        return {
          success: true,
          message: 'Reminder added successfully',
          mode: getDataMode(),
          data: reminder
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to add reminder'
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        phone: t.Optional(t.String()),
        medicine: t.String({ minLength: 1 }),
        time: t.String({ minLength: 1 }),
        dosage: t.String({ minLength: 1 }),
        quantity: t.Number({ minimum: 1 })
      })
    }
  )
  .get(
    '/list',
    async ({ query, set }) => {
      try {
        const reminders = await getRemindersForUser(query.userId);

        return {
          success: true,
          message: 'Reminders fetched successfully',
          mode: getDataMode(),
          data: reminders
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to fetch reminders'
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 })
      })
    }
  );
