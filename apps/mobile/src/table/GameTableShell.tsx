import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mobileTheme } from '../theme';

const { colors } = mobileTheme;

export function GameTableShell({
  hud,
  table,
  dock,
  overlay,
  style
}: {
  hud: ReactNode;
  table: ReactNode;
  dock?: ReactNode;
  overlay?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.root, style]} testID="game-table-shell">
      <LinearGradient
        colors={[colors.background, '#0a0a10', colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(232,197,71,0.08)', 'transparent', 'rgba(5,5,8,0.75)']}
        locations={[0, 0.5, 1]}
        style={styles.vignette}
        pointerEvents="none"
      />

      <View style={styles.column}>
        {hud}
        <View style={styles.tableArea}>{table}</View>
        {dock ? <View style={styles.dock}>{dock}</View> : null}
      </View>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  vignette: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  column: { flex: 1, zIndex: 10 },
  tableArea: { flex: 1, minHeight: 0 },
  dock: { flexShrink: 0 }
});
