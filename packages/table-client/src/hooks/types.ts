export type TableHapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export type TableSoundKind =
  | 'card'
  | 'chip'
  | 'fold'
  | 'check'
  | 'blind'
  | 'street'
  | 'win'
  | 'shuffle';

export type TableAnimationCallbacks = {
  haptic?: (kind: TableHapticKind) => void;
  playSound?: (kind: TableSoundKind) => void;
};
