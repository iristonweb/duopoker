import type { SessionState } from '@duopoker/shared-types/index';

export const maxRoundBet = (s: SessionState) =>
  s.players.reduce((m, p) => Math.max(m, s.playerRoundBet[p] ?? 0), 0);

export const amountToCall = (s: SessionState, uid: string) =>
  Math.max(0, maxRoundBet(s) - (s.playerRoundBet[uid] ?? 0));

export const sessionKettle = (s: SessionState) =>
  s.pot +
  Object.values(s.playerRoundBet ?? {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

export type RaiseBounds = {
  minTotal: number;
  maxTotal: number;
  canRaise: boolean;
  need: number;
  roundBet: number;
};

export const computeRaiseBounds = (session: SessionState | undefined, userId: string): RaiseBounds => {
  if (!session || session.mode === 'JOKER' || !userId) {
    return { minTotal: 0, maxTotal: 0, canRaise: false, need: 0, roundBet: 0 };
  }
  const roundBet = session.playerRoundBet[userId] ?? 0;
  const need = amountToCall(session, userId);
  const heroStack = session.stacks[userId] ?? 0;
  const minIncrement = session.bigBlind;
  const minTotal =
    need > 0 ? roundBet + need + minIncrement : Math.max(session.bigBlind, roundBet + minIncrement);
  const maxTotal = roundBet + heroStack;
  return { minTotal, maxTotal, canRaise: minTotal <= maxTotal, need, roundBet };
};

export const halfPotRaise = (bounds: RaiseBounds, kettle: number) =>
  Math.max(
    bounds.minTotal,
    bounds.need > 0
      ? bounds.roundBet + bounds.need + Math.floor(kettle / 2)
      : bounds.roundBet + Math.floor(kettle / 2)
  );

export const potSizedRaise = (bounds: RaiseBounds, kettle: number) =>
  Math.max(
    bounds.minTotal,
    bounds.need > 0 ? bounds.roundBet + bounds.need + kettle : bounds.roundBet + kettle
  );
