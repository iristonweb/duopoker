import './load-env.js';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { httpRateLimit } from './middleware/http-rate-limit.js';
import { requestContext } from './middleware/request-context.js';
import { authRouter } from './routes/auth.js';
import { clubsRouter } from './routes/clubs.js';
import { monetizationRouter } from './routes/monetization.js';
import { oauthRouter } from './routes/oauth.js';
import { profileRouter } from './routes/profile.js';
import { stripeWebhookHandler } from './routes/stripe-webhook.js';
import { usersRouter } from './routes/users.js';
import { gameRouter } from './routes/game.js';
import { voiceRouter } from './routes/voice.js';
import { createRealtimeServer } from './socket/server.js';
import { internalNotifyRouter } from './routes/internal-notify.js';
import { renderMetrics } from './services/metrics.js';
import { isMongoReady, tryConnectMongo } from './services/mongo.js';

const app = express();
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true
  })
);
app.post('/monetization/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(express.json());
app.use(requestContext);
app.use(httpRateLimit);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mongo: isMongoReady() ? 'up' : 'down' });
});
app.get('/metrics', (req, res) => {
  if (config.isProduction) {
    const token = config.metricsToken;
    const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!token || provided !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  res.setHeader('content-type', 'text/plain; version=0.0.4');
  res.send(renderMetrics());
});
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/clubs', clubsRouter);
app.use('/monetization', monetizationRouter);
app.use('/oauth', oauthRouter);
app.use('/users', usersRouter);
app.use('/game', gameRouter);
app.use('/voice', voiceRouter);
app.use('/internal', internalNotifyRouter);
app.use(errorHandler);

const { httpServer } = createRealtimeServer(app);

const start = async () => {
  await tryConnectMongo();
  httpServer.listen(config.port, () => {
    console.log(`Backend listening on ${config.port}`);
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
