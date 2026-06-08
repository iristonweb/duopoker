import { Hono } from 'hono';
import { cors } from 'hono/cors';
import './types/hono.js';
import { config } from './config.js';
import { rateLimit } from './middleware/rate-limit.js';
import { securityHeaders } from './middleware/security-headers.js';
import { authRoutes } from './routes/auth.js';
import { clubsRoutes } from './routes/clubs.js';
import { gameRoutes } from './routes/game.js';
import { monetizationRoutes } from './routes/monetization.js';
import { profileRoutes } from './routes/profile.js';
import { usersRoutes } from './routes/users.js';
import { voiceRoutes } from './routes/voice.js';
import { adminRoutes } from './routes/admin.js';
import { referralRoutes } from './routes/referrals.js';
import { notificationRoutes } from './routes/notifications.js';
import { complianceRoutes } from './routes/compliance.js';
import { correlationId } from './middleware/correlation-id.js';

export const app = new Hono().basePath('/api');

const allowedOrigins = new Set(config.corsOrigins);

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return config.publicWebUrl.replace(/\/$/, '');
      const normalized = origin.replace(/\/$/, '');
      return allowedOrigins.has(normalized) ? origin : null;
    },
    allowHeaders: ['Authorization', 'Content-Type', 'X-Device-Id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

app.use('*', securityHeaders);
app.use('*', correlationId);
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
app.route('/admin', adminRoutes);
app.route('/referrals', referralRoutes);
app.route('/notifications', notificationRoutes);
app.route('/compliance', complianceRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
