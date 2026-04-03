import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp } from './helpers/testApp';
import { requestJson } from './helpers/http';

describe('Reminder API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  test('GET / returns backend health information', async () => {
    const response = await requestJson<{
      success: boolean;
      message: string;
      data: { mode: 'mock' | 'supabase'; httpPort: number; socketPort: number; note: string };
    }>(app, 'GET', '/');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('backend is running');
    expect(['mock', 'supabase']).toContain(response.body.data.mode);
  });

  test('POST /api/reminder/add and GET /api/reminder/list store and retrieve reminders', async () => {
    const userId = crypto.randomUUID();

    const addResponse = await requestJson<{
      success: boolean;
      data: { user_id: string; medicine: string; dosage: string; time: string; quantity: number };
    }>(app, 'POST', '/api/reminder/add', {
      userId,
      medicine: 'Metformin',
      time: '08:00',
      dosage: '500mg',
      quantity: 1
    });

    expect(addResponse.status).toBe(201);
    expect(addResponse.body.success).toBe(true);
    expect(addResponse.body.data.user_id).toBe(userId);
    expect(addResponse.body.data.medicine).toBe('Metformin');

    const listResponse = await requestJson<{
      success: boolean;
      data: Array<{ user_id: string; medicine: string }>;
    }>(app, 'GET', `/api/reminder/list?userId=${userId}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.length).toBe(1);
    expect(listResponse.body.data[0]?.medicine).toBe('Metformin');
  });

  test('GET /api/reminder/list returns reminders sorted by time', async () => {
    const userId = crypto.randomUUID();

    await requestJson(app, 'POST', '/api/reminder/add', {
      userId,
      medicine: 'Aspirin',
      time: '21:30',
      dosage: '75mg',
      quantity: 1
    });

    await requestJson(app, 'POST', '/api/reminder/add', {
      userId,
      medicine: 'Vitamin D',
      time: '07:30',
      dosage: '1000IU',
      quantity: 1
    });

    const listResponse = await requestJson<{
      success: boolean;
      data: Array<{ medicine: string; time: string }>;
    }>(app, 'GET', `/api/reminder/list?userId=${userId}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data[0]?.time).toBe('07:30');
    expect(listResponse.body.data[1]?.time).toBe('21:30');
  });

  test('POST /api/reminder/add validates payload', async () => {
    const response = await requestJson<Record<string, unknown>>(
      app,
      'POST',
      '/api/reminder/add',
      {
        userId: '',
        medicine: 'Aspirin',
        time: '08:00',
        dosage: '75mg',
        quantity: 1
      }
    );

    expect([400, 422]).toContain(response.status);
    expect(response.body).toBeDefined();
  });
});