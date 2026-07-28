import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GameFeedEvent } from '@duopoker/table-client';

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
};

const STREET_BANNER_MS = 1400;

/** Street banners only — live actions stay on seats (parity with web). */
export function TableActionTicker({ events, pulseKey }: Props) {
  const [streetBanner, setStreetBanner] = useState<string | null>(null);
  const prevPulseRef = useRef(pulseKey);

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

  if (!streetBanner) return null;

  return (
    <View style={styles.wrap} pointerEvents="none" testID="table-action-ticker">
      <View style={styles.streetBanner}>
        <Text style={styles.streetText}>{streetBanner}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: '12%',
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
  }
});
