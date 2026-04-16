import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { httpRateLimit } from './middleware/http-rate-limit.js';
import { requestContext } from './middleware/request-context.js';
import { authRouter } from './routes/auth.js';
import { monetizationRouter } from './routes/monetization.js';
import { oauthRouter } from './routes/oauth.js';
import { profileRouter } from './routes/profile.js';
import { createRealtimeServer } from './socket/server.js';
import { renderMetrics } from './services/metrics.js';
import { mongoClient } from './services/mongo.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestContext);
app.use(httpRateLimit);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/metrics', (_req, res) => {
  res.setHeader('content-type', 'text/plain; version=0.0.4');
  res.send(renderMetrics());
});
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/monetization', monetizationRouter);
app.use('/oauth', oauthRouter);
app.use(errorHandler);

const { httpServer } = createRealtimeServer(app);

const start = async () => {
  await mongoClient.connect();
  httpServer.listen(config.port, () => {
    console.log(`Backend listening on ${config.port}`);
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
