import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  visible: boolean;
};

export function TableOrientationGate({ visible }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(rotate, { toValue: 0, duration: 900, useNativeDriver: true }),
        Animated.delay(600)
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, rotate]);

  if (!visible) return null;

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg']
  });

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right
        }
      ]}
      testID="table-orientation-gate"
      pointerEvents="box-only"
    >
      <View style={styles.panel}>
        <Animated.View style={[styles.phoneIcon, { transform: [{ rotate: spin }] }]}>
          <View style={styles.phoneScreen} />
        </Animated.View>
        <Text style={styles.title}>{t('table.rotateDevice')}</Text>
        <Text style={styles.hint}>{t('table.rotateDeviceHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,5,8,0.95)'
  },
  panel: {
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(5,5,8,0.98)',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center'
  },
  phoneIcon: {
    width: 44,
    height: 72,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(232,197,71,0.45)',
    backgroundColor: 'rgba(232,197,71,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  phoneScreen: {
    width: 28,
    height: 52,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(232,197,71,0.15)'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.goldLight,
    textAlign: 'center'
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center'
  }
});
