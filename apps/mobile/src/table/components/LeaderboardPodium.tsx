import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { EquippedCosmetics, GameMode, SubscriptionTier } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { PlayerAvatar } from './PlayerAvatar';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

export type LeaderboardProfile = {
  name: string;
  avatar?: string | null;
  subscriptionTier?: SubscriptionTier;
  equipped?: EquippedCosmetics;
};

const rankMedal = (rank: number): string | null => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

function podiumOrder(entries: TableLeaderboardEntry[]): TableLeaderboardEntry[] {
  const top = entries.slice(0, 3);
  if (top.length <= 1) return top;
  const sorted = [...top].sort((a, b) => a.rank - b.rank || a.score - b.score);
  if (sorted.length === 2) return sorted;
  const first = sorted.find((e) => e.rank === 1) ?? sorted[0]!;
  const second = sorted.find((e) => e.rank === 2) ?? sorted[1]!;
  const third = sorted.find((e) => e.rank === 3) ?? sorted[2]!;
  return [second, first, third];
}

type Props = {
  entries: TableLeaderboardEntry[];
  mode: GameMode;
  heroId?: string;
  profiles: Record<string, LeaderboardProfile>;
  onPress?: () => void;
  compact?: boolean;
  style?: ViewStyle;
};

function PodiumSlot({
  entry,
  heroId,
  profile,
  compact
}: {
  entry: TableLeaderboardEntry;
  heroId?: string;
  profile?: LeaderboardProfile;
  compact?: boolean;
}) {
  const name = profile?.name ?? entry.userId.slice(0, 6);
  const medal = rankMedal(entry.rank);
  const isFirst = entry.rank === 1;

  return (
    <View
      style={[
        styles.slot,
        isFirst && !compact && styles.slotFirst,
        entry.userId === heroId && styles.heroSlot
      ]}
    >
      <View style={[styles.avatarWrap, isFirst && styles.avatarWrapFirst]}>
        {profile ? (
          <PlayerAvatar
            name={name}
            avatarUrl={profile.avatar}
            frameId={profile.equipped?.frame ?? 'frame_none'}
            tier={profile.subscriptionTier ?? 'FREE'}
            size="sm"
            hideName
          />
        ) : (
          <View style={[styles.fallbackAvatar, isFirst && styles.fallbackFirst]}>
            <Text style={styles.fallbackText}>{name.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.rankBadge}>{medal ?? entry.rank}</Text>
      </View>
      <Text style={[styles.score, isFirst && styles.scoreFirst]}>{entry.score.toLocaleString()}</Text>
      <View
        style={[
          styles.pedestal,
          isFirst ? styles.pedestalGold : entry.rank === 2 ? styles.pedestalSilver : styles.pedestalBronze
        ]}
      />
    </View>
  );
}

export function LeaderboardPodium({
  entries,
  mode,
  heroId,
  profiles,
  onPress,
  compact = false,
  style
}: Props) {
  const { t } = useTranslation();
  const top = podiumOrder(entries);
  if (!top.length) return null;

  const content = (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {top.map((entry) => (
        <PodiumSlot
          key={entry.userId}
          entry={entry}
          heroId={heroId}
          profile={profiles[entry.userId]}
          compact={compact}
        />
      ))}
      {!compact ? (
        <Text style={styles.label}>
          {mode === 'JOKER' ? t('table.leaderboardPoints') : t('table.leaderboardChips')}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID="leaderboard-podium"
        accessibilityLabel={t('table.openLeaderboard')}
        onPress={onPress}
        style={({ pressed }) => [styles.shell, compact && styles.shellCompact, style, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID="leaderboard-podium" style={[styles.shell, compact && styles.shellCompact, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.28)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  shellCompact: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  rowCompact: { gap: 2 },
  slot: { alignItems: 'center', gap: 2 },
  slotFirst: { marginBottom: 2 },
  heroSlot: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.4)',
    paddingHorizontal: 2
  },
  avatarWrap: { position: 'relative', transform: [{ scale: 0.78 }] },
  avatarWrapFirst: { transform: [{ scale: 0.92 }] },
  rankBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    fontSize: 10
  },
  fallbackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,197,71,0.15)',
    borderWidth: 1,
    borderColor: colors.border
  },
  fallbackFirst: { width: 36, height: 36, borderRadius: 18 },
  fallbackText: { fontSize: 10, fontWeight: '700', color: colors.ivory },
  score: { fontSize: 9, fontWeight: '700', color: colors.goldLight, fontVariant: ['tabular-nums'] },
  scoreFirst: { fontSize: 10 },
  pedestal: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  pedestalGold: { width: 28, height: 8, backgroundColor: 'rgba(232,197,71,0.45)' },
  pedestalSilver: { width: 22, height: 6, backgroundColor: 'rgba(161,161,170,0.35)' },
  pedestalBronze: { width: 18, height: 5, backgroundColor: 'rgba(180,83,9,0.35)' },
  label: {
    marginLeft: 4,
    marginBottom: 4,
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'rgba(232,197,71,0.55)'
  }
});
