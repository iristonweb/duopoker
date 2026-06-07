import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  visible: boolean;
  onWatch: () => void;
  onLeave: () => void;
  leaving?: boolean;
  style?: ViewStyle;
};

export function BustedPlayerOverlay({ visible, onWatch, onLeave, leaving, style }: Props) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(220)} style={[styles.backdrop, style]}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>{t('table.bustedEyebrow')}</Text>
        <Text style={styles.title}>{t('table.bustedTitle')}</Text>
        <Text style={styles.desc}>{t('table.bustedDesc')}</Text>
        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.pressed]} onPress={onWatch}>
            <Text style={styles.btnTextSecondary}>{t('table.watchTable')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]}
            disabled={leaving}
            onPress={onLeave}
          >
            <Text style={styles.btnTextDanger}>{leaving ? t('table.leaving') : t('table.leaveTable')}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  panel: {
    maxWidth: 360,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: 'rgba(12,12,18,0.96)',
    padding: 24,
    alignItems: 'center'
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(253,164,175,0.8)'
  },
  title: { marginTop: 8, fontSize: 20, fontWeight: '600', color: colors.ivory, textAlign: 'center' },
  desc: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  actions: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  btn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center'
  },
  btnSecondary: { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)' },
  btnDanger: { borderColor: 'rgba(244,63,94,0.3)', backgroundColor: 'rgba(244,63,94,0.08)' },
  btnTextSecondary: { fontSize: 14, fontWeight: '600', color: colors.text },
  btnTextDanger: { fontSize: 14, fontWeight: '600', color: '#fda4af' },
  pressed: { opacity: 0.8 }
});
