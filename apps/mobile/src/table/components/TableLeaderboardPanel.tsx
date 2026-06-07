import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GameMode } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { PlayerAvatar } from './PlayerAvatar';
import { mobileTheme } from '../../theme';
import type { LeaderboardProfile } from './LeaderboardPodium';

const { colors } = mobileTheme;

const rankIcon = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

type Props = {
  entries: TableLeaderboardEntry[];
  mode: GameMode;
  heroId?: string;
  profiles: Record<string, LeaderboardProfile>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyIn?: number;
  style?: ViewStyle;
};

export function TableLeaderboardPanel({
  entries,
  mode,
  heroId,
  profiles,
  open,
  onOpenChange,
  buyIn,
  style
}: Props) {
  const { t } = useTranslation();
  const scoreHeader = mode === 'JOKER' ? t('table.leaderboardPoints') : t('table.leaderboardChips');

  return (
    <>
      <Pressable
        testID="table-leaderboard-fab"
        accessibilityLabel={t('table.openLeaderboard')}
        style={[styles.fab, open && styles.fabOpen, style]}
        onPress={() => onOpenChange(true)}
      >
        <Text style={styles.fabIcon}>🏆</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => onOpenChange(false)} />
          <View style={styles.sheet} testID="table-leaderboard-sheet">
            <View style={styles.handle} />
            <Text style={styles.eyebrow}>{t('table.liveTable')}</Text>
            <Text style={styles.title}>{t('table.leaderboardTitle')}</Text>

            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.rankCol]}>#</Text>
              <Text style={[styles.headerCell, styles.nameCol]}>{t('table.leaderboard')}</Text>
              <Text style={[styles.headerCell, styles.scoreCol]}>{scoreHeader}</Text>
              <Text style={[styles.headerCell, styles.deltaCol]}>{t('table.leaderboardHandDelta')}</Text>
            </View>

            <ScrollView style={styles.list}>
              {entries.length === 0 ? (
                <Text style={styles.empty}>{t('table.leaderboardEmpty')}</Text>
              ) : (
                entries.map((entry) => {
                const profile = profiles[entry.userId];
                const name = profile?.name ?? entry.userId.slice(0, 8);
                const isHero = entry.userId === heroId;
                const delta = entry.handDelta;
                const netPl =
                  mode === 'HOLDEM' && buyIn !== undefined ? entry.score - buyIn : undefined;

                return (
                  <View
                    key={entry.userId}
                    testID="leaderboard-row"
                    style={[
                      styles.row,
                      entry.rank === 1 && styles.rowGold,
                      entry.rank === 2 && styles.rowSilver,
                      entry.rank === 3 && styles.rowBronze,
                      isHero && styles.heroRow
                    ]}
                  >
                    <Text style={styles.rankCol}>{rankIcon(entry.rank)}</Text>
                    <View style={[styles.nameCol, styles.nameCell]}>
                      {profile ? (
                        <PlayerAvatar
                          name={name}
                          avatarUrl={profile.avatar}
                          frameId={profile.equipped?.frame ?? 'frame_none'}
                          tier={profile.subscriptionTier ?? 'FREE'}
                          size="sm"
                          hideName
                        />
                      ) : null}
                      <View style={styles.nameTextWrap}>
                        <Text style={styles.name} numberOfLines={1}>
                          {name}
                          {isHero ? ` (${t('table.leaderboardYou')})` : ''}
                        </Text>
                        {netPl !== undefined ? (
                          <Text style={[styles.netPl, netPl >= 0 ? styles.positive : styles.negative]}>
                            {netPl >= 0 ? '+' : ''}
                            {netPl}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Text style={[styles.scoreCol, styles.score]}>{entry.score.toLocaleString()}</Text>
                    <Text
                      style={[
                        styles.deltaCol,
                        styles.delta,
                        delta === undefined
                          ? styles.deltaEmpty
                          : delta > 0
                            ? styles.positive
                            : delta < 0
                              ? styles.negative
                              : styles.deltaEmpty
                      ]}
                    >
                      {delta === undefined ? '—' : delta > 0 ? `+${delta}` : String(delta)}
                    </Text>
                  </View>
                );
              })
              )}
            </ScrollView>

            <Pressable style={styles.closeBtn} onPress={() => onOpenChange(false)}>
              <Text style={styles.closeBtnText}>{t('table.leaderboardClose')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 12,
    bottom: 140,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(0,0,0,0.55)'
  },
  fabOpen: {
    borderColor: 'rgba(232,197,71,0.6)',
    backgroundColor: 'rgba(232,197,71,0.15)',
    shadowOpacity: 0.28
  },
  fabIcon: { fontSize: 18 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)',
    backgroundColor: 'rgba(5,5,8,0.96)',
    paddingBottom: 24
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
    marginBottom: 12
  },
  eyebrow: {
    paddingHorizontal: 16,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(232,197,71,0.6)'
  },
  title: {
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.goldLight
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  headerCell: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSubtle
  },
  list: { maxHeight: 320 },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSubtle
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  heroRow: {
    backgroundColor: 'rgba(232,197,71,0.08)',
    borderLeftWidth: 2,
    borderLeftColor: colors.gold
  },
  rowGold: { backgroundColor: 'rgba(232,197,71,0.1)' },
  rowSilver: { backgroundColor: 'rgba(161,161,170,0.06)' },
  rowBronze: { backgroundColor: 'rgba(180,83,9,0.08)' },
  rankCol: { width: 28, fontSize: 14 },
  nameCol: { flex: 1 },
  scoreCol: { width: 56, textAlign: 'right' },
  deltaCol: { width: 44, textAlign: 'right' },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameTextWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '600', color: colors.ivory },
  netPl: { fontSize: 10, marginTop: 2 },
  score: { fontSize: 13, fontWeight: '700', color: colors.goldLight, fontVariant: ['tabular-nums'] },
  delta: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  deltaEmpty: { color: colors.textSubtle },
  positive: { color: colors.emerald },
  negative: { color: colors.danger },
  closeBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    paddingVertical: 12,
    alignItems: 'center'
  },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted }
});
