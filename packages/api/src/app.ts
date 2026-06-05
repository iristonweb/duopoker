import { Hono } from 'hono';
import { cors } from 'hono/cors';
import './types/hono.js';
import { authRoutes } from './routes/auth.js';
import { clubsRoutes } from './routes/clubs.js';
import { gameRoutes } from './routes/game.js';
import { monetizationRoutes } from './routes/monetization.js';
import { profileRoutes } from './routes/profile.js';
import { voiceRoutes } from './routes/voice.js';

export const app = new Hono().basePath('/api');

app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    allowHeaders: ['Authorization', 'Content-Type', 'X-Device-Id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

app.get('/health', (c) => c.json({ status: 'ok', runtime: 'vercel-serverless' }));

app.route('/auth', authRoutes);
app.route('/profile', profileRoutes);
app.route('/game', gameRoutes);
app.route('/monetization', monetizationRoutes);
app.route('/clubs', clubsRoutes);
app.route('/voice', voiceRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
