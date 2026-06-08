import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  canSendTableChat,
  createTableChatMessage,
  getTableChatHistory,
  markTableChatSent,
  appendTableChatMessage,
  clearTableChatSession
} from './table-chat.js';

describe('table-chat', () => {
  beforeEach(() => {
    clearTableChatSession('sess-1');
    vi.useRealTimers();
  });

  it('stores and returns message history capped at 100', () => {
    for (let i = 0; i < 105; i++) {
      appendTableChatMessage(
        createTableChatMessage({
          sessionId: 'sess-1',
          userId: 'u1',
          displayName: 'Player',
          text: `msg-${i}`
        })
      );
    }
    const history = getTableChatHistory('sess-1');
    expect(history).toHaveLength(100);
    expect(history[0]?.text).toBe('msg-5');
    expect(history.at(-1)?.text).toBe('msg-104');
  });

  it('rate limits chat sends per user per session', () => {
    clearTableChatSession('sess-rate');
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    expect(canSendTableChat('u1', 'sess-rate')).toBe(true);
    markTableChatSent('u1', 'sess-rate');
    vi.setSystemTime(11_000);
    expect(canSendTableChat('u1', 'sess-rate')).toBe(false);
    vi.setSystemTime(12_000);
    expect(canSendTableChat('u1', 'sess-rate')).toBe(true);
    vi.useRealTimers();
  });
});
