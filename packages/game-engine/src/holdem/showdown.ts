import type { SessionState } from '@duopoker/shared-types/index';
import { uncalledRoundBet } from '../pot-calculator';
import { totalInKettle, withHandComplete } from './helpers';

export const applyUncalledReturn = (state: SessionState): SessionState => {
  const uncalled = uncalledRoundBet(state);
  if (!uncalled) return state;
  const stacks = { ...state.stacks };
  stacks[uncalled.playerId] = (stacks[uncalled.playerId] ?? 0) + uncalled.amount;
  const playerRoundBet = {
    ...state.playerRoundBet,
    [uncalled.playerId]: (state.playerRoundBet[uncalled.playerId] ?? 0) - uncalled.amount
  };
  const handContributions = {
    ...state.handContributions,
    [uncalled.playerId]: Math.max(
      0,
      (state.handContributions[uncalled.playerId] ?? 0) - uncalled.amount
    )
  };
  return { ...state, stacks, playerRoundBet, handContributions };
};

export const awardSingleWinner = (state: SessionState, winnerId: string): SessionState => {
  const awarded = applyUncalledReturn(state);
  const won = totalInKettle(awarded);
  const stacks = { ...awarded.stacks };
  stacks[winnerId] = (stacks[winnerId] ?? 0) + won;
  return withHandComplete({
    ...awarded,
    street: 'COMPLETE',
    phase: 'SHOWDOWN',
    pot: 0,
    currentBet: 0,
    playerRoundBet: Object.fromEntries(awarded.players.map((p) => [p, 0])),
    stacks,
    winners: [winnerId],
    winnersShare: { [winnerId]: won },
    readyForNextHand: [],
    activePlayerIndex: awarded.players.indexOf(winnerId),
    activePlayerId: winnerId
  });
};
