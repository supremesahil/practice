import { Elysia, t } from 'elysia';
import type { BurnoutInput, BurnoutLevel } from '../types';

const assessBurnout = ({ userId, mood }: BurnoutInput) => {
  const normalizedMood = mood.trim().toLowerCase();

  let burnoutLevel: BurnoutLevel = 'low';
  let suggestion = 'Low burnout risk. Keep a healthy routine and continue regular check-ins.';

  if (['exhausted', 'overwhelmed', 'burned out', 'burnt out', 'hopeless'].includes(normalizedMood)) {
    burnoutLevel = 'high';
    suggestion =
      'High burnout risk. Encourage rest, check in with a caregiver, and reduce non-essential tasks.';
  } else if (['tired', 'stressed', 'anxious', 'drained', 'sad'].includes(normalizedMood)) {
    burnoutLevel = 'medium';
    suggestion = 'Medium burnout risk. Add a break, hydration, and a quick caregiver follow-up.';
  }

  return {
    userId: userId ?? null,
    mood,
    burnoutLevel,
    suggestion
  };
};

export const burnoutRoutes = new Elysia({ prefix: '/api' }).post(
  '/burnout',
  async ({ body, set }) => {
    try {
      return {
        success: true,
        message: 'Burnout assessment completed',
        data: assessBurnout(body)
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assess burnout'
      };
    }
  },
  {
    body: t.Object({
      userId: t.Optional(t.String()),
      mood: t.String({ minLength: 1 })
    }),
    detail: {
      summary: 'Assess burnout level',
      description: 'Returns a simple low, medium, or high burnout level based on the submitted mood.',
      tags: ['Wellbeing']
    }
  }
);
