import type { TableChatMessage } from '@duopoker/shared-types/index';
import { prisma } from '../lib/prisma.js';
import { resolveChatSender } from './chat-profile.js';

const MAX_MESSAGES = 100;
const RATE_LIMIT_MS = 2000;
const WAIT_POLL_MS = 350;
const WAIT_MAX_MS = 25_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const toDto = (row: {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  text: string;
  createdAt: Date;
}): TableChatMessage => ({
  id: row.id,
  sessionId: row.sessionId,
  userId: row.userId,
  displayName: row.displayName,
  avatar: row.avatar,
  text: row.text,
  at: row.createdAt.getTime()
});

export async function getTableChatHistory(
  sessionId: string,
  after?: number
): Promise<TableChatMessage[]> {
  const rows = await prisma.tableChatMessage.findMany({
    where: {
      sessionId,
      ...(after != null && Number.isFinite(after)
        ? { createdAt: { gt: new Date(after) } }
        : {})
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_MESSAGES
  });
  return rows.map(toDto);
}

export async function sendTableChatMessage(
  sessionId: string,
  userId: string,
  text: string
): Promise<
  { ok: true; message: TableChatMessage } | { ok: false; code: 'CHAT_RATE_LIMIT' | 'INVALID_CHAT_PAYLOAD' }
> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 280) {
    return { ok: false, code: 'INVALID_CHAT_PAYLOAD' };
  }

  const last = await prisma.tableChatMessage.findFirst({
    where: { sessionId, userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });
  if (last && Date.now() - last.createdAt.getTime() < RATE_LIMIT_MS) {
    return { ok: false, code: 'CHAT_RATE_LIMIT' };
  }

  const sender = await resolveChatSender(userId);
  const row = await prisma.tableChatMessage.create({
    data: {
      sessionId,
      userId,
      displayName: sender.displayName,
      avatar: sender.avatar,
      text: trimmed
    }
  });

  const count = await prisma.tableChatMessage.count({ where: { sessionId } });
  if (count > MAX_MESSAGES) {
    const excess = await prisma.tableChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: count - MAX_MESSAGES,
      select: { id: true }
    });
    if (excess.length > 0) {
      await prisma.tableChatMessage.deleteMany({
        where: { id: { in: excess.map((e) => e.id) } }
      });
    }
  }

  return { ok: true, message: toDto(row) };
}

export async function waitForTableChatMessages(
  sessionId: string,
  after?: number
): Promise<TableChatMessage[]> {
  const deadline = Date.now() + WAIT_MAX_MS;
  while (Date.now() < deadline) {
    const messages = await getTableChatHistory(sessionId, after);
    if (messages.length > 0) return messages;
    await sleep(WAIT_POLL_MS);
  }
  return [];
}

export async function clearTableChatSession(sessionId: string) {
  await prisma.tableChatMessage.deleteMany({ where: { sessionId } });
}
