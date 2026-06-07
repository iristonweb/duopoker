import * as Haptics from 'expo-haptics';

export type TableHapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export async function tableHaptic(kind: TableHapticKind) {
  try {
    if (kind === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (kind === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === 'heavy') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (kind === 'medium') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    /* ignore unavailable haptics */
  }
}
