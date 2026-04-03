import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { handleVoiceQuery } from './controllers/voiceController';
import type { MedicineReminder } from './types';

export const geminiRoutes = new Elysia({ prefix: '/api/voice' })
  .use(cors())
  .post(
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

        const result = await handleVoiceQuery(
          { userId, query },
          reminders || []
        );

        return result;
      } catch (error) {
        set.status = 500;
        console.error('Voice API error:', error);
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
      }),
      detail: {
        summary: 'Process voice query about medicines',
        description: 'Patient asks questions about their medicines via voice, returns natural language response',
        tags: ['Voice', 'Gemini']
      }
    }
  );

export { handleVoiceQuery };
