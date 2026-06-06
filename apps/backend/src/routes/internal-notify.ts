import { Router } from 'express';
import { config } from '../config.js';
import { emitNotificationToUsers } from '../socket/server.js';

export const internalNotifyRouter = Router();

internalNotifyRouter.post('/notify', (req, res) => {
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!config.notifyInternalSecret || token !== config.notifyInternalSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { userIds, event, payload } = req.body as {
    userIds?: string[];
    event?: string;
    payload?: unknown;
  };

  if (!Array.isArray(userIds) || !event) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  emitNotificationToUsers(userIds, event, payload ?? {});
  res.json({ ok: true, delivered: userIds.length });
});
