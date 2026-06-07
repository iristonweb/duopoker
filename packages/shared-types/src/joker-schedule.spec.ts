import { describe, expect, it } from 'vitest';
import {
  JOKER_RECOMMENDED_PLAYERS,
  clampMatchPlayerCount,
  clubTableMaxPlayers,
  matchmakingPlayerTarget,
  minPlayersToStart
} from './joker-schedule';

describe('match player count helpers', () => {
  it('forces 4 players for JOKER bot tables', () => {
    expect(clampMatchPlayerCount('JOKER', 2)).toBe(JOKER_RECOMMENDED_PLAYERS);
    expect(clampMatchPlayerCount('JOKER', 6)).toBe(JOKER_RECOMMENDED_PLAYERS);
  });

  it('clamps Holdem between 2 and 6', () => {
    expect(clampMatchPlayerCount('HOLDEM', 1)).toBe(2);
    expect(clampMatchPlayerCount('HOLDEM', 4)).toBe(4);
    expect(clampMatchPlayerCount('HOLDEM', 9)).toBe(6);
  });

  it('forces 4 seats for JOKER club tables', () => {
    expect(clubTableMaxPlayers('JOKER', 6)).toBe(4);
    expect(clubTableMaxPlayers('HOLDEM', 6)).toBe(6);
  });

  it('requires 4 for JOKER matchmaking and dealing', () => {
    expect(matchmakingPlayerTarget('JOKER')).toBe(4);
    expect(minPlayersToStart('JOKER')).toBe(4);
    expect(matchmakingPlayerTarget('HOLDEM')).toBe(2);
    expect(minPlayersToStart('HOLDEM')).toBe(2);
  });
});
