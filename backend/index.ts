import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { burnoutRoutes } from './routes/burnout';
import { reminderRoutes } from './routes/reminder';
import { sosRoutes } from './routes/sos';
import { statusRoutes } from './routes/status';
import { getDataMode, getRuntimeNote } from './db/supabase';
import { initializeSocketServer } from './socket/socket';

const port = Number(Bun.env.PORT ?? 3000);
const socketPort = Number(Bun.env.SOCKET_PORT ?? 3001);

initializeSocketServer(socketPort);

const app = new Elysia()
  .use(
    cors({
      origin: true
    })
  )
  .use(
    openapi({
      path: '/swagger',
      provider: 'swagger-ui',
      documentation: {
        info: {
          title: 'Remote Care Companion API',
          version: '1.0.0',
          description:
            'Hackathon demo backend for reminders, dose tracking, SOS alerts, and burnout checks.'
        },
        tags: [
          { name: 'Health', description: 'Basic service health and runtime mode' },
          { name: 'Reminders', description: 'Reminder creation and listing' },
          { name: 'Status', description: 'Medicine dose status updates' },
          { name: 'Alerts', description: 'SOS and alert-triggering endpoints' },
          { name: 'Wellbeing', description: 'Burnout assessment endpoint' }
        ]
      }
    })
  )
  .get(
    '/',
    () => ({
      success: true,
      message: 'Remote Care Companion backend is running',
      data: {
        httpPort: port,
        socketPort,
        mode: getDataMode(),
        note: getRuntimeNote()
      }
    }),
    {
      detail: {
        summary: 'Health check',
        description: 'Returns server status, ports, and whether the app is using Supabase or mock mode.',
        tags: ['Health']
      }
    }
  )
  .use(reminderRoutes)
  .use(statusRoutes)
  .use(sosRoutes)
  .use(burnoutRoutes)
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
  })
  .listen(port);

console.log(`[server] Remote Care Companion API running at http://localhost:${port}`);
console.log(`[server] Data mode: ${getDataMode()} | ${getRuntimeNote()}`);

export type App = typeof app;
