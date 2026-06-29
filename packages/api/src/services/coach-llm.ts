export type CoachHintContext = {
  mode: 'HOLDEM' | 'JOKER' | 'RASPISNOY';
  street: string;
  heroCards: string[];
  communityCards: string[];
  pot: number;
  legalActions?: string[];
};

const SYSTEM_PROMPT = `You are a play-money poker coach for DuoPoker. Give one concise, actionable hint (2-3 sentences) for the hero only. Never suggest real-money gambling. Do not reference opponent hole cards.`;

export const buildCoachUserPrompt = (ctx: CoachHintContext): string =>
  [
    `Mode: ${ctx.mode}`,
    `Street: ${ctx.street}`,
    `Hero cards: ${ctx.heroCards.join(' ') || 'hidden'}`,
    `Board: ${ctx.communityCards.join(' ') || 'none'}`,
    `Pot: ${ctx.pot}`,
    ctx.legalActions?.length ? `Legal actions: ${ctx.legalActions.join(', ')}` : null
  ]
    .filter(Boolean)
    .join('\n');

export const fallbackCoachHint = (ctx: CoachHintContext): string => {
  if (ctx.legalActions?.includes('check')) {
    return 'You can check for free here. Consider pot odds and how your hand connects with the board before betting.';
  }
  if (ctx.pot > 0 && ctx.legalActions?.includes('fold')) {
    return 'With chips already in the pot, compare your hand strength to the board texture before calling or raising.';
  }
  return 'Play tight early, widen selectively in position, and size bets relative to the pot — virtual chips only, no real-money value.';
};

export async function requestCoachHint(
  ctx: CoachHintContext,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 180,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildCoachUserPrompt(ctx) }
      ]
    })
  });
  if (!res.ok) {
    throw new Error(`coach_llm_${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('coach_llm_empty');
  return text;
}
