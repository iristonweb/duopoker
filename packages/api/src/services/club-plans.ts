export const PLAN_LIMITS = {
  BASIC: { maxMembers: 30, maxActiveTables: 2 },
  PRO: { maxMembers: 150, maxActiveTables: 8 },
  NETWORK: { maxMembers: 600, maxActiveTables: 20 }
} as const;

export const ORGANIZER_PLAN_PRICES_RUB: Record<'PRO' | 'NETWORK', number> = {
  PRO: 2990,
  NETWORK: 7990
};

export const NON_GAMBLING_DISCLAIMER =
  'DuoPoker private clubs are play-money only. No cashout, no rake, no payout handling, and no peer-to-peer money transfers in product.';

export const effectiveMaxPlayers = (maxPlayers: number) => Math.min(maxPlayers, 6);
