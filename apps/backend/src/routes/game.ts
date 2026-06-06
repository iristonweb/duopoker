import { Router } from 'express';
import { authGuard } from '../middleware/auth-guard.js';
import { getSessionSnapshot } from '../services/game-session.js';
import { getSessionPlayerProfiles } from '../services/private-table-auth.js';

export const gameRouter = Router();

gameRouter.use(authGuard);

gameRouter.get('/session/:sessionId/players', async (req, res) => {
  const userId = req.auth!.userId;
  const sessionId = req.params.sessionId;
  const snapshot = await getSessionSnapshot(sessionId);
  if (!snapshot) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (!snapshot.players.includes(userId)) {
    return res.status(403).json({ error: 'Not seated at this table' });
  }
  const players = await getSessionPlayerProfiles(snapshot.players);
  return res.json({ players });
});
