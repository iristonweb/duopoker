import { Router } from 'express';
import { config } from '../config.js';

export const oauthRouter = Router();

oauthRouter.get('/google/status', (_req, res) => {
  res.json({ enabled: config.oauthGoogleEnabled });
});

oauthRouter.get('/apple/status', (_req, res) => {
  res.json({ enabled: config.oauthAppleEnabled });
});
