export function rotatePlayersForHero<T extends { userId: string }>(players: T[], heroId: string): T[] {
  if (players.length <= 1) return players;
  const heroIdx = players.findIndex((p) => p.userId === heroId);
  if (heroIdx < 0) return players;
  const n = players.length;
  const targetIdx = n <= 2 ? n - 1 : 3;
  const rotateBy = (targetIdx - heroIdx + n) % n;
  return [...players.slice(rotateBy), ...players.slice(0, rotateBy)];
}

export const isBotUserId = (userId: string) => userId.startsWith('duopoker-bot');

export const botDisplayIndex = (userId: string) => {
  const suffix = userId.split('-').pop();
  if (suffix && /^\d+$/.test(suffix)) return Number(suffix) + 1;
  return 1;
};
