import {
  cosmeticById,
  cosmeticImageUrl,
  defaultEquipped,
  type SubscriptionTier
} from '@duopoker/shared-types';

const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://duopoker.ru').replace(/\/$/, '');

export const resolveAssetUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${WEB_BASE}${url}`;
  return `${WEB_BASE}/${url}`;
};

const resolveUrl = (id: string, fallbackId: string): string => {
  const raw =
    cosmeticImageUrl(id) ?? cosmeticImageUrl(fallbackId) ?? cosmeticById(fallbackId)?.imageUrl ?? '';
  return resolveAssetUrl(raw);
};

export const deckBackUrl = (deckId: string): string => resolveUrl(deckId, defaultEquipped().deck);

export const chipImageUrl = (chipId: string): string => resolveUrl(chipId, defaultEquipped().chip);

export const frameImageUrl = (frameId: string): string => resolveUrl(frameId, defaultEquipped().frame);

export const tableFeltUrl = (tableId: string): string => {
  const raw = cosmeticImageUrl(tableId) ?? '/assets/table-felt.png';
  return resolveAssetUrl(raw);
};

export type TableFeltVisual = {
  meshColor: string;
  rimColor: string;
  ambientGlow: string;
};

export const tableFeltVisual = (tableId: string): TableFeltVisual => {
  if (tableId === 'table_void') {
    return { meshColor: '#0a0618', rimColor: '#6d28d9', ambientGlow: 'rgba(139, 92, 246, 0.28)' };
  }
  if (tableId === 'table_platinum') {
    return { meshColor: '#1a1530', rimColor: '#a78bfa', ambientGlow: 'rgba(167, 139, 250, 0.22)' };
  }
  if (tableId === 'table_diamond') {
    return { meshColor: '#061820', rimColor: '#22d3ee', ambientGlow: 'rgba(34, 211, 238, 0.2)' };
  }
  return { meshColor: '#0d3d28', rimColor: '#c9a227', ambientGlow: 'rgba(232, 197, 71, 0.18)' };
};

export const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

export const avatarGradientColors = (tier: SubscriptionTier): [string, string, string] => {
  switch (tier) {
    case 'BLACK':
      return ['rgba(251,191,36,0.35)', 'rgba(232,197,71,0.2)', 'rgba(24,24,27,0.35)'];
    case 'DIAMOND':
      return ['rgba(34,211,238,0.35)', 'rgba(14,165,233,0.2)', 'rgba(30,58,138,0.25)'];
    case 'PLATINUM':
      return ['rgba(139,92,246,0.35)', 'rgba(99,102,241,0.2)', 'rgba(56,189,248,0.15)'];
    case 'GOLD':
      return ['rgba(232,197,71,0.4)', 'rgba(217,119,6,0.2)', 'rgba(74,222,128,0.12)'];
    case 'SILVER':
      return ['rgba(212,212,216,0.3)', 'rgba(113,113,122,0.2)', 'rgba(63,63,70,0.15)'];
    case 'BRONZE':
      return ['rgba(180,83,9,0.3)', 'rgba(154,52,18,0.2)', 'rgba(39,39,42,0.15)'];
    default:
      return ['rgba(74,222,128,0.2)', 'rgba(12,12,18,0.9)', 'rgba(5,5,8,0.95)'];
  }
};
