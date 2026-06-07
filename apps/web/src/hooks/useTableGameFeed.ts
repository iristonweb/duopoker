import { useMemo } from 'react';
import {
  useTableGameFeed as useTableGameFeedBase,
  useCommunityCardSounds as useCommunityCardSoundsBase,
  type TableSoundKind
} from '@duopoker/table-client';
import {
  playBlindSound,
  playCardSound,
  playCheckSound,
  playChipSound,
  playFoldSound,
  playStreetSound,
  playWinSound
} from '../lib/table-sounds';

export type { GameFeedEvent } from '@duopoker/table-client';

const webPlaySound = (kind: TableSoundKind) => {
  switch (kind) {
    case 'card':
      playCardSound();
      break;
    case 'chip':
      playChipSound();
      break;
    case 'fold':
      playFoldSound();
      break;
    case 'check':
      playCheckSound();
      break;
    case 'blind':
      playBlindSound();
      break;
    case 'street':
      playStreetSound();
      break;
    case 'win':
      playWinSound();
      break;
    default:
      break;
  }
};

export function useTableGameFeed(
  session: Parameters<typeof useTableGameFeedBase>[0],
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundEnabled = true,
  soundOptions: Parameters<typeof useTableGameFeedBase>[4] = {}
) {
  const playSound = useMemo(() => (soundEnabled ? webPlaySound : undefined), [soundEnabled]);
  return useTableGameFeedBase(session, label, t, soundEnabled, soundOptions, playSound);
}

export function useCommunityCardSounds(communityCount: number, soundEnabled = true) {
  const playSound = useMemo(() => (soundEnabled ? webPlaySound : undefined), [soundEnabled]);
  useCommunityCardSoundsBase(communityCount, soundEnabled, playSound);
}
