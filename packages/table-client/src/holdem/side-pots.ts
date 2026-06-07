import type { SessionState } from '@duopoker/shared-types/index';
import { computeSidePots } from '@duopoker/game-engine';

type Translate = (key: string, opts?: Record<string, unknown>) => string;

type SidePotSession = Pick<
  SessionState,
  'mode' | 'street' | 'players' | 'handContributions' | 'foldedPlayerIds'
>;

const holdemSidePotList = (session: SidePotSession): number[] => {
  if (session.mode !== 'HOLDEM' || session.street === 'LOBBY') return [];
  const folded = new Set(session.foldedPlayerIds ?? []);
  const pots = computeSidePots(session.players, session.handContributions ?? {}, folded);
  return pots.length > 1 ? pots.map((p) => p.amount) : [];
};

export const holdemSidePotAmounts = (session: SidePotSession): number[] => holdemSidePotList(session);

/** Pot anchor index for chip flights after a bet/call/raise. */
export const potIndexForChipFlight = (
  players: string[],
  handContributions: Record<string, number>,
  foldedPlayerIds: string[] | undefined,
  userId: string,
  chipAmount: number
): number => {
  const folded = new Set(foldedPlayerIds ?? []);
  const pots = computeSidePots(players, handContributions, folded);
  if (pots.length <= 1 || chipAmount <= 0) return 0;

  const after = handContributions[userId] ?? 0;
  const before = Math.max(0, after - chipAmount);
  const levels = [...new Set(players.map((p) => handContributions[p] ?? 0))]
    .filter((x) => x > 0)
    .sort((a, b) => a - b);

  let idx = 0;
  for (let i = 0; i < levels.length; i += 1) {
    const level = levels[i]!;
    if (level > before && level <= after) idx = i;
    else if (level <= after) idx = Math.max(idx, i);
  }
  return Math.min(idx, pots.length - 1);
};

export const holdemSidePotSummary = (
  session: Pick<SessionState, 'mode' | 'street' | 'players' | 'handContributions' | 'foldedPlayerIds'>,
  t: Translate
): string | undefined => {
  if (session.mode !== 'HOLDEM' || session.street !== 'COMPLETE') return undefined;
  const folded = new Set(session.foldedPlayerIds ?? []);
  const pots = computeSidePots(session.players, session.handContributions ?? {}, folded);
  if (pots.length <= 1) return undefined;
  return pots
    .map((pot, i) =>
      t('table.sidePotLine', {
        index: i + 1,
        amount: pot.amount,
        players: pot.eligible.length
      })
    )
    .join(' · ');
};
