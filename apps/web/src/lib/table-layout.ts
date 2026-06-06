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

/** Absolute Tailwind position classes for seat index around the table. */
export const seatLayout = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'left-1/2 top-[4%] -translate-x-1/2'
      : 'bottom-[4%] left-1/2 -translate-x-1/2';
  }
  const positions = [
    'left-1/2 top-[3%] -translate-x-1/2',
    'right-[4%] top-[20%]',
    'right-[5%] bottom-[22%]',
    'left-1/2 bottom-[3%] -translate-x-1/2',
    'left-[4%] bottom-[22%]',
    'left-[4%] top-[20%]'
  ];
  return positions[index % positions.length] ?? positions[0];
};
