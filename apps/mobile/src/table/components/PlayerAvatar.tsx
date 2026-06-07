import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { SubscriptionTier } from '@duopoker/shared-types';
import { tierLabel } from '@duopoker/shared-types';
import { avatarGradientColors, frameImageUrl, initialsFromName } from '../lib/cosmetics';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

const sizeMap = {
  sm: { outer: 48, inner: 36, nameSize: 9, nameWidth: 88 },
  md: { outer: 64, inner: 48, nameSize: 11, nameWidth: 112 },
  lg: { outer: 80, inner: 56, nameSize: 12, nameWidth: 144 }
} as const;

export function PlayerAvatar({
  name,
  avatarUrl,
  tableStatus,
  frameId = 'frame_none',
  tier = 'FREE',
  active = false,
  folded = false,
  size = 'md',
  showTier = false,
  isBot = false,
  hideName = false,
  style
}: {
  name: string;
  avatarUrl?: string | null;
  tableStatus?: string | null;
  frameId?: string;
  tier?: SubscriptionTier;
  active?: boolean;
  folded?: boolean;
  size?: keyof typeof sizeMap;
  showTier?: boolean;
  isBot?: boolean;
  hideName?: boolean;
  style?: ViewStyle;
}) {
  const s = sizeMap[size];
  const grad = avatarGradientColors(tier);

  return (
    <View style={[styles.wrap, style, folded && styles.folded]}>
      <View style={[styles.outer, { width: s.outer, height: s.outer }, active && styles.activeOuter]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.avatar, { width: s.inner, height: s.inner, borderRadius: s.inner / 2 }]}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={grad}
            style={[styles.avatar, { width: s.inner, height: s.inner, borderRadius: s.inner / 2 }]}
          >
            <Text style={[styles.initials, { fontSize: s.nameSize + 2 }]}>{initialsFromName(name)}</Text>
          </LinearGradient>
        )}
        {frameId !== 'frame_none' ? (
          <Image
            source={{ uri: frameImageUrl(frameId) }}
            style={[styles.frame, { width: s.outer, height: s.outer }]}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.defaultRing, { width: s.outer, height: s.outer, borderRadius: s.outer / 2 }]} />
        )}
        {active ? <View style={styles.activeDot} /> : null}
        {isBot ? (
          <View style={styles.botBadge}>
            <Text style={styles.botText}>AI</Text>
          </View>
        ) : null}
      </View>
      {!hideName ? (
        <Text
          style={[styles.name, { fontSize: s.nameSize, maxWidth: s.nameWidth }, active && styles.nameActive]}
          numberOfLines={1}
        >
          {name}
        </Text>
      ) : null}
      {!hideName && tableStatus ? (
        <Text style={styles.status} numberOfLines={1}>
          {tableStatus}
        </Text>
      ) : null}
      {showTier && tier !== 'FREE' && !hideName ? (
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{tierLabel[tier]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  folded: { opacity: 0.45 },
  outer: { alignItems: 'center', justifyContent: 'center' },
  activeOuter: { transform: [{ scale: 1.04 }] },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 1
  },
  initials: { color: colors.ivory, fontWeight: '600' },
  frame: { position: 'absolute', zIndex: 2 },
  defaultRing: {
    position: 'absolute',
    zIndex: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
    zIndex: 3
  },
  botBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.4)',
    backgroundColor: 'rgba(74,222,128,0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  botText: { fontSize: 8, fontWeight: '700', color: colors.emerald },
  name: { marginTop: 4, color: colors.textMuted, textAlign: 'center' },
  nameActive: { color: colors.goldLight },
  status: { marginTop: 2, maxWidth: 96, fontSize: 9, color: 'rgba(232,197,71,0.75)', textAlign: 'center' },
  tierBadge: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(232,197,71,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  tierText: { fontSize: 9, color: colors.goldLight, fontWeight: '600' }
});
