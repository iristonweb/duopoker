import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors } from '@duopoker/shared-types';
import { useMobileStore } from '../src/state/useMobileStore';
import { fetchOfferings, isPurchasesConfigured, purchasePackage, restorePurchases } from '../src/lib/purchases';
import { mobileTheme } from '../src/theme';

export default function ShopScreen() {
  const userId = useMobileStore((s) => s.userId);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isPurchasesConfigured()) {
      setStatus('Purchases are not configured for this build.');
      return;
    }
    const offerings = await fetchOfferings();
    const current = offerings?.current?.availablePackages ?? [];
    setPackages(current);
    if (!current.length) {
      setStatus('No products available yet.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPurchase = async (pkg: PurchasesPackage) => {
    setBusy(true);
    setStatus(null);
    try {
      await purchasePackage(pkg);
      setStatus('Purchase completed. Entitlements sync shortly.');
    } catch {
      setStatus('Purchase cancelled or failed.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      setStatus('Purchases restored.');
    } catch {
      setStatus('Could not restore purchases.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.surfaceElevated]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Shop</Text>
          <Text style={styles.subtitle}>Virtual chips and subscriptions — play-money only.</Text>
          {!isPurchasesConfigured() ? (
            <Text style={styles.muted}>Set RevenueCat keys in EXPO_PUBLIC_REVENUECAT_* to enable IAP.</Text>
          ) : null}
          {packages.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              disabled={busy}
              style={styles.row}
              onPress={() => void onPurchase(pkg)}
            >
              <Text style={styles.rowTitle}>{pkg.product.title}</Text>
              <Text style={styles.rowPrice}>{pkg.product.priceString}</Text>
            </Pressable>
          ))}
          <Pressable disabled={busy} onPress={() => void onRestore()} style={styles.restore}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </Pressable>
          {busy ? <ActivityIndicator color={colors.gold} /> : null}
          {status ? <Text style={styles.muted}>{status}</Text> : null}
          {userId ? <Text style={styles.muted}>Account: {userId.slice(0, 8)}…</Text> : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = mobileTheme.spacing;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, padding: s.lg, gap: s.md },
  back: { color: colors.gold, fontSize: 14 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  row: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowTitle: { color: colors.text, fontWeight: '600', flex: 1, paddingRight: 8 },
  rowPrice: { color: colors.gold, fontWeight: '700' },
  restore: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { color: colors.gold, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13 }
});
