import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import type { GameMode } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { mobileTheme } from '../../theme';
import { LeaderboardPodium, type LeaderboardProfile } from './LeaderboardPodium';

const { colors } = mobileTheme;

type Props = {
  visible: boolean;
  winners?: string;
  summaryText?: string;
  handRankLine?: string;
  sidePotLine?: string;
  summaryHeading?: string;
  gameOver: boolean;
  gameOverMessage?: string;
  nextHandSeconds: number | null;
  canPeekGhostBoard?: boolean;
  ghostBoardVisible?: boolean;
  onToggleGhostBoard?: () => void;
  showGhostUpsell?: boolean;
  leaderboardEntries?: TableLeaderboardEntry[];
  leaderboardProfiles?: Record<string, LeaderboardProfile>;
  heroId?: string;
  mode?: GameMode;
  buyIn?: number;
  style?: ViewStyle;
};

export function HandResultOverlay({
  visible,
  winners,
  summaryText,
  handRankLine,
  sidePotLine,
  summaryHeading,
  gameOver,
  gameOverMessage,
  nextHandSeconds,
  canPeekGhostBoard = false,
  ghostBoardVisible = false,
  onToggleGhostBoard,
  showGhostUpsell = false,
  leaderboardEntries,
  leaderboardProfiles = {},
  heroId,
  mode = 'HOLDEM',
  buyIn,
  style
}: Props) {
  const { t } = useTranslation();
  if (!visible) return null;

  const resultLine =
    summaryText !== undefined ? summaryText : t('table.winners', { names: winners || '—' });

  return (
    <Animated.View
      entering={SlideInUp.duration(350)}
      exiting={FadeOut.duration(250)}
      style={[styles.wrap, style]}
      pointerEvents="box-none"
    >
      <Animated.View entering={FadeIn.duration(300)} style={styles.panel}>
        <Text style={styles.eyebrow}>{summaryHeading ?? t('table.handResult')}</Text>
        <Text style={styles.title}>{gameOver ? t('table.gameOver') : t('table.handComplete')}</Text>
        {!gameOver ? <Text style={styles.result}>{resultLine}</Text> : null}
        {handRankLine ? <Text style={styles.sub}>{handRankLine}</Text> : null}
        {sidePotLine ? <Text style={styles.sub}>{sidePotLine}</Text> : null}

        {gameOver && leaderboardEntries?.length ? (
          <View style={styles.podiumWrap}>
            <Text style={styles.podiumTitle}>👑 {t('table.leaderboardTitle')}</Text>
            <LeaderboardPodium
              entries={leaderboardEntries}
              mode={mode}
              heroId={heroId}
              profiles={leaderboardProfiles}
            />
            {leaderboardEntries.slice(0, 5).map((entry) => {
              const name = leaderboardProfiles[entry.userId]?.name ?? entry.userId.slice(0, 8);
              const netPl =
                mode === 'HOLDEM' && buyIn !== undefined ? entry.score - buyIn : undefined;
              return (
                <View key={entry.userId} style={[styles.leaderRow, entry.rank === 1 && styles.leaderGold, entry.userId === heroId && styles.heroRow]}>
                  <Text style={styles.leaderName} numberOfLines={1}>
                    #{entry.rank} {name}
                  </Text>
                  <Text style={styles.leaderScore}>
                    {entry.score.toLocaleString()}
                    {netPl !== undefined ? (
                      <Text style={netPl >= 0 ? styles.positive : styles.negative}>
                        {' '}
                        ({netPl >= 0 ? '+' : ''}
                        {netPl})
                      </Text>
                    ) : null}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {canPeekGhostBoard && onToggleGhostBoard ? (
          <Pressable style={styles.ghostBtn} onPress={onToggleGhostBoard}>
            <Text style={styles.ghostBtnText}>
              {ghostBoardVisible ? t('table.hideGhostBoard') : t('table.peekGhostBoard')}
            </Text>
          </Pressable>
        ) : null}
        {showGhostUpsell ? (
          <Text style={styles.sub}>{t('table.ghostBoardUpsell')}</Text>
        ) : null}

        {gameOver ? (
          <Text style={styles.footerHighlight}>{gameOverMessage ?? t('table.gameOver')}</Text>
        ) : nextHandSeconds !== null && nextHandSeconds > 0 ? (
          <Text style={styles.footer}>{t('table.nextHandAuto', { seconds: nextHandSeconds })}</Text>
        ) : (
          <Text style={styles.footer}>{t('table.dealingNext')}</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 132,
    zIndex: 20,
    alignItems: 'center'
  },
  panel: {
    maxWidth: 400,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(12,12,18,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(232,197,71,0.7)'
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '600',
    color: colors.goldLight,
    textAlign: 'center'
  },
  result: { marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  sub: { marginTop: 4, fontSize: 12, color: colors.textSubtle, textAlign: 'center' },
  podiumWrap: {
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 8
  },
  podiumTitle: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(232,197,71,0.65)'
  },
  leaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4
  },
  heroRow: {
    backgroundColor: 'rgba(232,197,71,0.08)',
    borderRadius: 8
  },
  leaderGold: {
    backgroundColor: 'rgba(232,197,71,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)'
  },
  leaderName: { flex: 1, fontSize: 12, color: colors.textMuted },
  leaderScore: { fontSize: 12, fontWeight: '700', color: colors.goldLight, fontVariant: ['tabular-nums'] },
  positive: { color: colors.emerald, fontWeight: '600' },
  negative: { color: colors.danger, fontWeight: '600' },
  ghostBtn: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  ghostBtnText: { fontSize: 11, fontWeight: '600', color: colors.goldLight, textTransform: 'uppercase' },
  footer: { marginTop: 8, fontSize: 12, color: colors.textSubtle, textAlign: 'center' },
  footerHighlight: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.goldLight,
    textAlign: 'center'
  }
});
