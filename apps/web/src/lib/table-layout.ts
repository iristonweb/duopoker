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

/** Offset action bubble toward open felt space (inward from seat rim). */
export const bubbleOffset = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'top-full left-1/2 mt-2 -translate-x-1/2'
      : '-top-14 left-1/2 -translate-x-1/2';
  }
  const region = index % 6;
  switch (region) {
    case 0:
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    case 1:
      return 'right-full top-1/2 mr-2 -translate-y-1/2 translate-x-0';
    case 2:
      return 'right-full top-1/2 mr-2 -translate-y-1/2 translate-x-0';
    case 3:
      return '-top-14 left-1/2 -translate-x-1/2';
    case 4:
      return 'left-full top-1/2 ml-2 -translate-y-1/2 translate-x-0';
    case 5:
      return 'left-full top-1/2 ml-2 -translate-y-1/2 translate-x-0';
    default:
      return '-top-14 left-1/2 -translate-x-1/2';
  }
};
