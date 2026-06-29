import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  visible: boolean;
};

export function AllInRunoutBanner({ visible }: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.banner}>
        <Text style={styles.icon}>★</Text>
        <Text style={styles.text}>{t('table.allInRunoutBanner')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '16%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 35
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
    backgroundColor: 'rgba(245,158,11,0.18)'
  },
  icon: {
    color: colors.goldLight,
    fontSize: 14
  },
  text: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  }
});
