import { Hono } from 'hono';
import { cors } from 'hono/cors';
import './types/hono.js';
import { config } from './config.js';
import { rateLimit } from './middleware/rate-limit.js';
import { authRoutes } from './routes/auth.js';
import { clubsRoutes } from './routes/clubs.js';
import { gameRoutes } from './routes/game.js';
import { monetizationRoutes } from './routes/monetization.js';
import { profileRoutes } from './routes/profile.js';
import { usersRoutes } from './routes/users.js';
import { voiceRoutes } from './routes/voice.js';

export const app = new Hono().basePath('/api');

const allowedOrigins = new Set(
  [config.publicWebUrl, 'http://localhost:5180', 'http://localhost:5173']
    .map((url) => url.replace(/\/$/, ''))
    .filter(Boolean)
);

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return config.publicWebUrl.replace(/\/$/, '');
      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalized)) return origin;
      if (!config.isProduction) return origin;
      return config.publicWebUrl.replace(/\/$/, '');
    },
    allowHeaders: ['Authorization', 'Content-Type', 'X-Device-Id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

app.use('*', rateLimit(120, 60_000));
app.use('/auth/*', rateLimit(20, 60_000));

app.get('/health', (c) => c.json({ status: 'ok', runtime: 'vercel-serverless' }));

app.route('/auth', authRoutes);
app.route('/profile', profileRoutes);
app.route('/users', usersRoutes);
app.route('/game', gameRoutes);
app.route('/monetization', monetizationRoutes);
app.route('/clubs', clubsRoutes);
app.route('/voice', voiceRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
