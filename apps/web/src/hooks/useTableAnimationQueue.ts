import { useMemo } from 'react';
import {
  useTableAnimationQueue as useTableAnimationQueueBase,
  type TableAnimationCallbacks
} from '@duopoker/table-client';
import {
  playBlindSound,
  playCardSound,
  playCheckSound,
  playChipSound,
  playFoldSound
} from '../lib/table-sounds';
import { tableHaptic } from '../lib/table-haptics';

export type { SeatActionBubble, ChipFlight, JokerCardFlight } from '@duopoker/table-client';

export function useTableAnimationQueue(
  session: Parameters<typeof useTableAnimationQueueBase>[0],
  heroId: string,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundOn: boolean,
  reduceMotion: boolean
) {
  const callbacks = useMemo<TableAnimationCallbacks>(
    () => ({
      haptic: tableHaptic,
      playSound: (kind) => {
        if (!soundOn) return;
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
          default:
            break;
        }
      }
    }),
    [soundOn]
  );

  return useTableAnimationQueueBase(session, heroId, label, t, soundOn, reduceMotion, callbacks);
}
