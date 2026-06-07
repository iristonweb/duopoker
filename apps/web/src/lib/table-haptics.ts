export type TableHapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const VIBRATE_MS: Record<TableHapticKind, number | number[]> = {
  light: 12,
  medium: 22,
  heavy: 36,
  success: [12, 40, 12],
  error: [28, 24, 28]
};

export function tableHaptic(kind: TableHapticKind) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(VIBRATE_MS[kind]);
    } catch {
      /* ignore */
    }
  }
}
