const NICKNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;

export const normalizeNicknameInput = (raw: string): string => {
  const trimmed = raw.trim().replace(/^@/, '').toLowerCase();
  return trimmed.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
};

export const isValidNickname = (nickname: string): boolean => NICKNAME_RE.test(nickname);

export const nicknameFromDisplayName = (displayName: string): string => {
  let base = normalizeNicknameInput(displayName);
  if (base.length < 3) base = `player_${base}`.slice(0, 20);
  if (base.length < 3) base = 'player';
  return base.slice(0, 20);
};

export const uniqueNicknameCandidates = (base: string, suffixSeed: string): string[] => {
  const candidates = [base];
  for (let i = 1; i <= 99; i++) {
    const suffix = i === 1 ? `_${suffixSeed.slice(0, 4)}` : `_${i}`;
    const trimmed = base.slice(0, Math.max(3, 20 - suffix.length)) + suffix;
    candidates.push(trimmed);
  }
  return candidates;
};

export async function resolveUniqueNickname(
  prisma: { user: { findUnique: (args: { where: { nickname: string } }) => Promise<{ id: string } | null> } },
  displayName: string,
  suffixSeed: string
): Promise<string> {
  const base = nicknameFromDisplayName(displayName);
  for (const candidate of uniqueNicknameCandidates(base, suffixSeed)) {
    const existing = await prisma.user.findUnique({ where: { nickname: candidate } });
    if (!existing) return candidate;
  }
  return `player_${suffixSeed.slice(0, 12)}`;
}
