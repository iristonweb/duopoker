import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    tableChatMessage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('./chat-profile.js', () => ({
  resolveChatSender: vi.fn().mockResolvedValue({ displayName: 'Player', avatar: null })
}));

import { prisma } from '../lib/prisma.js';
import {
  getTableChatHistory,
  sendTableChatMessage,
  waitForTableChatMessages
} from './table-chat.js';

describe('api table-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps history rows to TableChatMessage DTOs', async () => {
    const createdAt = new Date('2026-06-08T12:00:00.000Z');
    vi.mocked(prisma.tableChatMessage.findMany).mockResolvedValue([
      {
        id: 'm1',
        sessionId: 'sess-1',
        userId: 'u1',
        displayName: 'Player',
        avatar: null,
        text: 'hello',
        createdAt
      }
    ] as never);

    const history = await getTableChatHistory('sess-1');
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: 'm1',
      text: 'hello',
      at: createdAt.getTime()
    });
  });

  it('waitForTableChatMessages returns when new rows appear', async () => {
    vi.mocked(prisma.tableChatMessage.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'm2',
          sessionId: 'sess-1',
          userId: 'u1',
          displayName: 'Player',
          avatar: null,
          text: 'ping',
          createdAt: new Date()
        }
      ] as never);

    const messages = await waitForTableChatMessages('sess-1', Date.now() - 1000);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe('ping');
  });

  it('rate limits sends within 2 seconds', async () => {
    vi.mocked(prisma.tableChatMessage.findFirst).mockResolvedValue({
      createdAt: new Date()
    } as never);

    const result = await sendTableChatMessage('sess-1', 'u1', 'hi');
    expect(result).toEqual({ ok: false, code: 'CHAT_RATE_LIMIT' });
  });
});
