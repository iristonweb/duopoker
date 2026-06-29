import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { GameMode, GameStreet, JokerHandState, JokerMatchRules, SubscriptionTier } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { VoiceChatPill } from './VoiceChatPill';
import { JokerTrumpBadge } from './JokerTrumpBadge';
import { LeaderboardPodium, type LeaderboardProfile } from './LeaderboardPodium';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

const streetColor = (street: GameStreet): { bg: string; border: string; text: string } => {
  if (street === 'PREFLOP' || street === 'FLOP' || street === 'BIDDING' || street === 'TRUMP_CHOICE') {
    return { bg: 'rgba(232,197,71,0.12)', border: 'rgba(232,197,71,0.35)', text: colors.goldLight };
  }
  if (street === 'TURN' || street === 'RIVER' || street === 'TRICKS') {
    return { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)', text: colors.emerald };
  }
  if (street === 'SHOWDOWN' || street === 'COMPLETE') {
    return { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.35)', text: colors.danger };
  }
  return { bg: 'rgba(255,255,255,0.04)', border: colors.border, text: colors.textMuted };
};

type Props = {
  mode: GameMode;
  pot: number;
  street?: GameStreet;
  seatCount: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  chipId?: string;
  onLeaveTable?: () => void;
  leaving?: boolean;
  joker?: JokerHandState | null;
  jokerRules?: JokerMatchRules;
  subscriptionTier?: SubscriptionTier;
  leaderboardEntries?: TableLeaderboardEntry[];
  leaderboardProfiles?: Record<string, LeaderboardProfile>;
  heroId?: string;
  onOpenLeaderboard?: () => void;
  style?: ViewStyle;
};

function MetaChips({
  mode,
  isJoker,
  joker,
  jokerRules,
  smallBlind,
  bigBlind,
  seatCount,
  street,
  showStreet,
  streetLabel,
  streetStyle,
  t
}: {
  mode: GameMode;
  isJoker: JokerHandState | null | false;
  joker: JokerHandState | null | undefined;
  jokerRules?: JokerMatchRules;
  smallBlind: number;
  bigBlind: number;
  seatCount: number;
  street?: GameStreet;
  showStreet: boolean | '' | null | undefined;
  streetLabel: string | null;
  streetStyle: { bg: string; border: string; text: string } | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const bidding = street === 'BIDDING';

  return (
    <View style={styles.metaWrap}>
      {isJoker && joker ? (
        <JokerTrumpBadge joker={joker} showHint={bidding} compact />
      ) : null}
      {showStreet && streetStyle ? (
        <View style={[styles.streetBadge, { backgroundColor: streetStyle.bg, borderColor: streetStyle.border }]}>
          <Text style={[styles.streetText, { color: streetStyle.text }]}>{streetLabel}</Text>
        </View>
      ) : null}
      <Text style={styles.metaText}>
        {mode === 'HOLDEM'
          ? t('table.blinds', { sb: smallBlind, bb: bigBlind })
          : isJoker && joker
            ? t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })
            : ''}
      </Text>
      <View style={styles.seatBadge}>
        <Text style={styles.seatBadgeText}>{t('table.seats', { count: seatCount })}</Text>
      </View>
      {isJoker && jokerRules?.strictJoker ? <Text style={styles.metaTag}>{t('lobby.jokerStrict')}</Text> : null}
      {isJoker && jokerRules?.scoringMode === 'minus' ? (
        <Text style={styles.metaTag}>{t('lobby.jokerMinusScoring')}</Text>
      ) : null}
    </View>
  );
}

export function TableTopHUD({
  mode,
  street,
  seatCount,
  smallBlind,
  bigBlind,
  handNumber,
  onLeaveTable,
  leaving,
  joker,
  jokerRules,
  subscriptionTier = 'FREE',
  leaderboardEntries = [],
  leaderboardProfiles = {},
  heroId,
  onOpenLeaderboard,
  style
}: Props) {
  const { t } = useTranslation();
  const isJoker = mode === 'JOKER' && joker;
  const streetLabel = street ? t(`table.street.${street}`, { defaultValue: street }) : null;
  const showStreet = street && street !== 'LOBBY' && streetLabel;
  const streetStyle = street ? streetColor(street) : null;

  return (
    <View style={[styles.shell, style]} testID="table-top-hud">
      <LinearGradient
        colors={['rgba(232,197,71,0.12)', 'rgba(5,5,8,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.navRow}>
        {onLeaveTable ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            disabled={leaving}
            onPress={onLeaveTable}
          >
            <Text style={styles.backText}>← {t('nav.backLobby')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.navCenter}>
          <Text style={styles.navEyebrow}>{t('table.liveTable')}</Text>
          <Text style={styles.navTitle} numberOfLines={1}>
            {mode === 'HOLDEM' ? t('table.holdem') : t('table.joker')}
            {handNumber > 0 ? ` · #${handNumber}` : ''}
          </Text>
        </View>
        <View style={styles.navRight}>
          {onOpenLeaderboard ? (
            <Pressable style={styles.trophyBtn} onPress={onOpenLeaderboard}>
              <Text style={styles.trophyIcon}>🏆</Text>
            </Pressable>
          ) : null}
          <VoiceChatPill compact subscriptionTier={subscriptionTier} />
        </View>
      </View>

      <View style={styles.statsRow}>
        {leaderboardEntries.length > 0 ? (
          <LeaderboardPodium
            entries={leaderboardEntries}
            mode={mode}
            heroId={heroId}
            profiles={leaderboardProfiles}
            onPress={onOpenLeaderboard}
            compact
          />
        ) : (
          <View style={styles.statsSpacer} />
        )}
      </View>

      <MetaChips
        mode={mode}
        isJoker={isJoker}
        joker={joker}
        jokerRules={jokerRules}
        smallBlind={smallBlind}
        bigBlind={bigBlind}
        seatCount={seatCount}
        street={street}
        showStreet={showStreet}
        streetLabel={streetLabel}
        streetStyle={streetStyle}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,197,71,0.25)',
    backgroundColor: 'rgba(5,5,8,0.92)'
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 8
  },
  backBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.2)',
    backgroundColor: colors.glass,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  backText: { fontSize: 10, fontWeight: '600', color: 'rgba(232,197,71,0.8)' },
  pressed: { opacity: 0.75 },
  navCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  navEyebrow: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: 'rgba(232,197,71,0.5)'
  },
  navTitle: { fontSize: 13, fontWeight: '700', color: colors.goldLight },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trophyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(232,197,71,0.1)',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3
  },
  trophyIcon: { fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8
  },
  statsSpacer: { flex: 1 },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  streetBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  streetText: { fontSize: 10, fontWeight: '600' },
  metaText: { fontSize: 10, color: colors.textSubtle, fontVariant: ['tabular-nums'] },
  seatBadge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  seatBadgeText: { fontSize: 9, color: colors.textMuted },
  metaTag: { fontSize: 9, color: colors.emerald, fontWeight: '600' }
});
