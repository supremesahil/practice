import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp } from './helpers/testApp';
import { requestJson } from './helpers/http';

describe('Status, SOS, and Burnout APIs', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  test('POST /api/status/update with taken does not create missed alert', async () => {
    const userId = crypto.randomUUID();

    const response = await requestJson<{
      success: boolean;
      data: {
        log: { user_id: string; status: 'taken' | 'later' | 'skip' };
        alert: null | { type: string };
      };
    }>(app, 'POST', '/api/status/update', {
      userId,
      status: 'taken'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.log.user_id).toBe(userId);
    expect(response.body.data.log.status).toBe('taken');
    expect(response.body.data.alert).toBeNull();
  });

  test('POST /api/status/update with skip creates missed alert', async () => {
    const userId = crypto.randomUUID();

    const response = await requestJson<{
      success: boolean;
      data: {
        log: { status: 'taken' | 'later' | 'skip' };
        alert: { type: 'missed'; message: string };
      };
    }>(app, 'POST', '/api/status/update', {
      userId,
      status: 'skip'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.log.status).toBe('skip');
    expect(response.body.data.alert.type).toBe('missed');
    expect(response.body.data.alert.message).toContain(userId);
  });

  test('POST /api/sos creates SOS alert with default message fallback', async () => {
    const userId = crypto.randomUUID();

    const response = await requestJson<{
      success: boolean;
      data: { alert: { type: 'sos'; message: string } };
    }>(app, 'POST', '/api/sos', {
      userId
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.alert.type).toBe('sos');
    expect(response.body.data.alert.message).toContain(userId);
  });

  test('POST /api/burnout returns high burnout for overwhelmed mood', async () => {
    const response = await requestJson<{
      success: boolean;
      data: { burnoutLevel: 'low' | 'medium' | 'high'; suggestion: string };
    }>(app, 'POST', '/api/burnout', {
      userId: crypto.randomUUID(),
      mood: 'overwhelmed'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.burnoutLevel).toBe('high');
    expect(response.body.data.suggestion.toLowerCase()).toContain('high burnout risk');
  });

  test('POST /api/status/update validates invalid status values', async () => {
    const response = await requestJson<Record<string, unknown>>(
      app,
      'POST',
      '/api/status/update',
      {
        userId: crypto.randomUUID(),
        status: 'invalid-status'
      }
    );

    expect([400, 422]).toContain(response.status);
    expect(response.body).toBeDefined();
  });
});