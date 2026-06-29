import type { Server, Socket } from 'socket.io';
import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { assertSeatedInSession } from '../../services/session-access.js';
import { processPlayerAction } from '../../services/game-session.js';
import { isMongoReady, getMongoDb } from '../../services/mongo.js';
import { redis } from '../../services/redis.js';
import { resolveUserId } from '../socket-auth.js';
import { actionSchema } from '../schemas.js';

type ActionSchema = typeof actionSchema;
type BroadcastFn = (io: Server, sessionId: string, state: SessionState) => Promise<void>;

export const registerPlayerActionHandler = (
  io: Server,
  socket: Socket,
  parsedSchema: ActionSchema,
  clearActionTimer: (sessionId: string) => void,
  broadcastSessionState: BroadcastFn
) => {
  const replayCollection = getMongoDb().collection('replays');

  socket.on('playerAction', async (payload) => {
    const parsed = parsedSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('sessionError', { code: 'INVALID_ACTION_PAYLOAD' });
      return;
    }

    clearActionTimer(parsed.data.sessionId);

    const userId = resolveUserId(socket, parsed.data.userId);
    if (!userId) {
      socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
      return;
    }

    const seated = await assertSeatedInSession(parsed.data.sessionId, userId);
    if (!seated.ok) {
      socket.emit('sessionError', { code: seated.reason });
      return;
    }

    const action: PlayerAction = {
      sessionId: parsed.data.sessionId,
      userId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      raiseBy: parsed.data.raiseBy,
      at: parsed.data.at,
      ...(parsed.data.card ? { card: parsed.data.card as Card } : {}),
      ...(parsed.data.trumpSuit !== undefined ? { trumpSuit: parsed.data.trumpSuit } : {}),
      ...(parsed.data.declaration !== undefined ? { declaration: parsed.data.declaration } : {})
    };
    const result = await processPlayerAction(action);
    if (result.rejected) {
      socket.emit('sessionError', { code: result.reason });
      return;
    }

    if (isMongoReady()) {
      try {
        await replayCollection.insertOne({
          sessionId: parsed.data.sessionId,
          action: parsed.data,
          createdAt: new Date(parsed.data.at)
        });
      } catch (e) {
        console.warn('[mongo] replay insert skipped:', e);
      }
    }
    await redis.publish(`game:${parsed.data.sessionId}`, JSON.stringify(parsed.data));
    await broadcastSessionState(io, parsed.data.sessionId, result.state);
    io.to(parsed.data.sessionId).emit('reconciliation', { replay: result.replay });
  });
};

export { actionSchema };
