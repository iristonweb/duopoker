import { describe, expect, it } from 'vitest';
import { buildCoachUserPrompt, fallbackCoachHint } from './coach-llm.js';

describe('coach-llm', () => {
  it('builds a sanitized prompt without opponent data', () => {
    const prompt = buildCoachUserPrompt({
      mode: 'HOLDEM',
      street: 'FLOP',
      heroCards: ['AS', 'KH'],
      communityCards: ['2D', '7C', 'JC'],
      pot: 120,
      legalActions: ['check', 'bet']
    });
    expect(prompt).toContain('Hero cards: AS KH');
    expect(prompt).not.toContain('opponent');
  });

  it('returns fallback hints when LLM is unavailable', () => {
    const hint = fallbackCoachHint({
      mode: 'HOLDEM',
      street: 'PRE_FLOP',
      heroCards: [],
      communityCards: [],
      pot: 0,
      legalActions: ['check']
    });
    expect(hint.length).toBeGreaterThan(10);
  });
});
