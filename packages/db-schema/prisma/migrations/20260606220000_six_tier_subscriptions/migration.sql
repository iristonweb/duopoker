-- Migrate subscription tiers from 4-level (SILVER..ROYAL) to 6-level (BRONZE..BLACK)

CREATE TYPE "Tier_new" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'BLACK');

-- Remap ROYAL subscriptions to BLACK and update subscription IDs
UPDATE "subscriptions" SET "id" = REPLACE("id", '-ROYAL', '-BLACK') WHERE "id" LIKE '%-ROYAL';

ALTER TABLE "subscriptions" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "tier" TYPE "Tier_new" USING (
  CASE "tier"::text
    WHEN 'ROYAL' THEN 'BLACK'::"Tier_new"
    WHEN 'SILVER' THEN 'SILVER'::"Tier_new"
    WHEN 'GOLD' THEN 'GOLD'::"Tier_new"
    WHEN 'PLATINUM' THEN 'PLATINUM'::"Tier_new"
    ELSE 'SILVER'::"Tier_new"
  END
);

DROP TYPE "Tier";
ALTER TYPE "Tier_new" RENAME TO "Tier";

-- Remap legacy royal cosmetic inventory IDs
UPDATE "user_inventory" SET "itemId" = REPLACE("itemId", '_royal', '_black') WHERE "itemId" LIKE '%_royal';
