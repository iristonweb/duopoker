import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';

let configured = false;

const revenueCatApiKey = (): string | undefined => {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
  }
  return undefined;
};

export const isPurchasesConfigured = (): boolean => Boolean(revenueCatApiKey());

export async function configurePurchases(userId?: string): Promise<void> {
  const apiKey = revenueCatApiKey();
  if (!apiKey || configured) return;
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  await Purchases.configure({ apiKey, appUserID: userId });
  configured = true;
}

export async function loginPurchases(userId: string): Promise<void> {
  await configurePurchases(userId);
  if (!isPurchasesConfigured()) return;
  await Purchases.logIn(userId);
}

export async function fetchOfferings() {
  if (!isPurchasesConfigured()) return null;
  await configurePurchases();
  return Purchases.getOfferings();
}

export async function purchasePackage(pkg: PurchasesPackage) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  if (!isPurchasesConfigured()) return null;
  await configurePurchases();
  return Purchases.restorePurchases();
}
