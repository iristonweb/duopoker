type Translate = (key: string, opts?: Record<string, unknown>) => string;

export const CHAT_ERROR_CODES = [
  'CHAT_RATE_LIMIT',
  'INVALID_CHAT_PAYLOAD',
  'NOT_IN_SESSION'
] as const;

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

export const isChatErrorCode = (code: string): code is ChatErrorCode =>
  (CHAT_ERROR_CODES as readonly string[]).includes(code);

const ERROR_KEY_MAP: Record<string, string> = {
  WRONG_TURN: 'table.errors.wrongTurn',
  INVALID_ACTION: 'table.errors.invalidAction',
  NO_JOKER_STATE: 'table.errors.noJokerState',
  ILLEGAL_CARD: 'table.errors.illegalCard',
  ILLEGAL_RAISE: 'table.errors.illegalRaise',
  JOKER_DECLARATION_REQUIRED: 'table.errors.jokerDeclarationRequired',
  NOMINAL_TRUMP_BANNED: 'table.errors.nominalTrumpBanned',
  DEALER_BID_BLOCKED: 'table.errors.dealerBidBlocked',
  action_rejected: 'table.errors.actionRejected',
  NOT_SEATED: 'table.errors.notSeated',
  NOT_ASSIGNED: 'table.errors.notAssigned',
  join_failed: 'table.errors.joinFailed',
  SESSION_NOT_FOUND: 'table.errors.sessionNotFound',
  AUTH_REQUIRED: 'table.errors.authRequired',
  connection_lost: 'table.errors.connectionLost',
  table_closed: 'table.errors.tableClosed',
  CHAT_RATE_LIMIT: 'table.errors.chatRateLimit',
  INVALID_CHAT_PAYLOAD: 'table.errors.invalidChatPayload',
  NOT_IN_SESSION: 'table.errors.notInSession'
};

export const formatTableError = (code: string, t: Translate): string => {
  const key = ERROR_KEY_MAP[code];
  if (key) return t(key);
  return t('table.actionError', { code });
};
