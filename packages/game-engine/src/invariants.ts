import type { SessionState } from '@duopoker/shared-types/index';
import { totalInKettle } from './holdem-table';

/** Total chips accounted for in stacks plus the kettle (pot + current-street bets). */
export const countChipsInPlay = (state: SessionState): number => {
  const stackTotal = Object.values(state.stacks).reduce((sum, value) => sum + value, 0);
  return stackTotal + totalInKettle(state);
};

export const assertChipConservation = (
  state: SessionState,
  expectedTotal: number,
  label?: string
): void => {
  const actual = countChipsInPlay(state);
  if (actual !== expectedTotal) {
    throw new Error(
      `${label ?? 'Chip conservation'}: expected ${expectedTotal}, got ${actual} (stacks + kettle)`
    );
  }
};
