import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { JokerHandState } from '@duopoker/shared-types/index';
import { isRedSuit, jokerTrumpDisplay } from '@duopoker/table-client';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  joker: Pick<JokerHandState, 'trumpSuit' | 'trumpCard'>;
  showHint?: boolean;
  compact?: boolean;
  style?: ViewStyle;
};

export function JokerTrumpBadge({ joker, showHint = false, compact = false, style }: Props) {
  const { t } = useTranslation();
  const trump = jokerTrumpDisplay(joker, t);

  return (
    <View style={[styles.shell, compact && styles.shellCompact, style]}>
      <Text style={[styles.heading, compact && styles.headingCompact]}>{t('table.jokerTrumpHeading')}</Text>
      {trump.noTrump ? (
        <Text style={[styles.value, compact && styles.valueCompact]}>{trump.value}</Text>
      ) : (
        <Text
          style={[
            styles.value,
            compact && styles.valueCompact,
            trump.suit && isRedSuit(trump.suit) ? styles.valueRed : styles.valueBlack
          ]}
        >
          {trump.value}
        </Text>
      )}
      {showHint && trump.hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {trump.hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.28)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  shellCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  heading: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: 'rgba(232,197,71,0.75)'
  },
  headingCompact: { fontSize: 8 },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ivory,
    marginTop: 1
  },
  valueCompact: { fontSize: 13 },
  valueRed: { color: '#fb7185' },
  valueBlack: { color: '#f4f4f5' },
  hint: {
    marginTop: 2,
    maxWidth: 160,
    textAlign: 'center',
    fontSize: 9,
    color: colors.textMuted
  }
});
