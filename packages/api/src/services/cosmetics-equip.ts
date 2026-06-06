import {
  allCosmetics,
  canEquipCosmetic,
  cosmeticById,
  resolveEquipped,
  type EquippedCosmetics
} from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { resolveUserSubscriptionTier } from './subscription-tier.js';

const slotItemIds = (slot: 'deck' | 'chip' | 'frame' | 'title' | 'table'): string[] =>
  allCosmetics.filter((c) => c.slot === slot).map((c) => c.id);

export const equipCosmeticItem = async (
  userId: string,
  itemId: string
): Promise<{ ok: true; equipped: EquippedCosmetics } | { ok: false; error: string }> => {
  const def = cosmeticById(itemId);
  if (!def) return { ok: false, error: 'ITEM_NOT_FOUND' };

  const tier = await resolveUserSubscriptionTier(userId);
  const inventoryRows = await prisma.userItem.findMany({
    where: { userId },
    select: { itemId: true, equipped: true }
  });
  const inventoryIds = inventoryRows.map((row) => row.itemId);

  if (!canEquipCosmetic(itemId, tier, inventoryIds)) {
    return { ok: false, error: 'NOT_ALLOWED' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userItem.updateMany({
      where: { userId, itemId: { in: slotItemIds(def.slot) } },
      data: { equipped: false }
    });

    const existing = await tx.userItem.findFirst({ where: { userId, itemId } });
    if (existing) {
      await tx.userItem.update({ where: { id: existing.id }, data: { equipped: true } });
    } else {
      await tx.userItem.create({
        data: { userId, itemId, rarity: def.rarity, equipped: true }
      });
    }
  });

  const updatedInventory = await prisma.userItem.findMany({
    where: { userId },
    select: { itemId: true, equipped: true }
  });
  const updatedIds = updatedInventory.map((row) => row.itemId);
  const equippedFromDb: Partial<EquippedCosmetics> = {};
  for (const row of updatedInventory) {
    if (!row.equipped) continue;
    const id = row.itemId;
    if (id.startsWith('deck_')) equippedFromDb.deck = id;
    if (id.startsWith('chip_')) equippedFromDb.chip = id;
    if (id.startsWith('frame_')) equippedFromDb.frame = id;
    if (id.startsWith('title_')) equippedFromDb.title = id;
    if (id.startsWith('table_')) equippedFromDb.table = id;
  }

  return {
    ok: true,
    equipped: resolveEquipped(equippedFromDb, tier, updatedIds)
  };
};
