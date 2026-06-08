import { randomUUID } from 'node:crypto';
import type { TableChatMessage } from '@duopoker/shared-types/index';

const MAX_MESSAGES = 100;
const RATE_LIMIT_MS = 2000;

const messagesBySession = new Map<string, TableChatMessage[]>();
const lastSentAt = new Map<string, number>();

export function getTableChatHistory(sessionId: string): TableChatMessage[] {
  return messagesBySession.get(sessionId) ?? [];
}

export function appendTableChatMessage(msg: TableChatMessage): TableChatMessage {
  const list = messagesBySession.get(msg.sessionId) ?? [];
  list.push(msg);
  if (list.length > MAX_MESSAGES) {
    list.splice(0, list.length - MAX_MESSAGES);
  }
  messagesBySession.set(msg.sessionId, list);
  return msg;
}

export function createTableChatMessage(input: {
  sessionId: string;
  userId: string;
  displayName: string;
  avatar?: string | null;
  text: string;
}): TableChatMessage {
  return {
    id: randomUUID(),
    sessionId: input.sessionId,
    userId: input.userId,
    displayName: input.displayName,
    avatar: input.avatar ?? null,
    text: input.text.trim(),
    at: Date.now()
  };
}

export function canSendTableChat(userId: string, sessionId: string): boolean {
  const key = `${sessionId}:${userId}`;
  const last = lastSentAt.get(key) ?? 0;
  return Date.now() - last >= RATE_LIMIT_MS;
}

export function markTableChatSent(userId: string, sessionId: string) {
  lastSentAt.set(`${sessionId}:${userId}`, Date.now());
}

export function clearTableChatSession(sessionId: string) {
  messagesBySession.delete(sessionId);
  for (const key of lastSentAt.keys()) {
    if (key.startsWith(`${sessionId}:`)) {
      lastSentAt.delete(key);
    }
  }
}
