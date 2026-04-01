import { cors } from '@elysiajs/cors';
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
