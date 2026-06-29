import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GameFeedEvent } from '@duopoker/table-client';

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
};

const STREET_BANNER_MS = 1200;

export function TableActionTicker({ events, pulseKey }: Props) {
  const [streetBanner, setStreetBanner] = useState<string | null>(null);
  const prevPulseRef = useRef(pulseKey);

  const recentActions = useMemo(
    () => events.filter((e) => e.kind === 'action').slice(0, 2),
    [events]
  );

  useEffect(() => {
    if (pulseKey === prevPulseRef.current) return;
    prevPulseRef.current = pulseKey;
    const latest = events[0];
    if (latest?.kind === 'street') {
      setStreetBanner(latest.text);
      const timer = setTimeout(() => setStreetBanner(null), STREET_BANNER_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pulseKey, events]);

  if (!recentActions.length && !streetBanner) return null;

  return (
    <View style={styles.wrap} pointerEvents="none" testID="table-action-ticker">
      {streetBanner ? (
        <View style={styles.streetBanner}>
          <Text style={styles.streetText}>{streetBanner}</Text>
        </View>
      ) : null}
      {recentActions.map((ev, i) => (
        <View key={ev.id} style={[styles.actionRow, i > 0 && styles.actionRowMuted]}>
          <Text style={[styles.actionText, i > 0 && styles.actionTextMuted]} numberOfLines={1}>
            {ev.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    bottom: '8%',
    zIndex: 28,
    alignItems: 'center',
    gap: 4
  },
  streetBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.45)',
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4
  },
  streetText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#f5e6a8',
    textAlign: 'center'
  },
  actionRow: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  actionRowMuted: {
    opacity: 0.72,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  actionText: {
    fontSize: 11,
    color: '#f5f5f4',
    textAlign: 'center'
  },
  actionTextMuted: {
    color: '#a8a29e'
  }
});
