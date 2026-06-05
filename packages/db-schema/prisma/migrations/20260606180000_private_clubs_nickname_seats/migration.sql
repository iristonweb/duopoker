-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'YOOKASSA';

-- CreateEnum
CREATE TYPE "PrivateTableSeatStatus" AS ENUM ('INVITED', 'ACCEPTED', 'SEATED', 'DECLINED');

-- AlterTable: add nickname (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "nickname" TEXT;

-- Backfill nicknames from displayName (lowercase, alphanumeric + underscore)
UPDATE "users" SET "nickname" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("displayName", '[^a-zA-Z0-9_]', '_', 'g'), '_+', '_', 'g'))
WHERE "nickname" IS NULL;

-- Ensure minimum length and handle empty
UPDATE "users" SET "nickname" = 'player_' || SUBSTRING("id", 1, 8)
WHERE "nickname" IS NULL OR LENGTH("nickname") < 3;

-- Resolve collisions with suffix
WITH ranked AS (
  SELECT id, nickname,
    ROW_NUMBER() OVER (PARTITION BY nickname ORDER BY "createdAt") AS rn
  FROM "users"
)
UPDATE "users" u SET "nickname" = u.nickname || '_' || SUBSTRING(u.id, 1, 4)
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- Make nickname required and unique
ALTER TABLE "users" ALTER COLUMN "nickname" SET NOT NULL;
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- AlterTable: private_tables
ALTER TABLE "private_tables" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "private_tables" ADD COLUMN "inviteCode" TEXT;

UPDATE "private_tables" SET "inviteCode" = "id" WHERE "inviteCode" IS NULL;

ALTER TABLE "private_tables" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "private_tables_sessionId_key" ON "private_tables"("sessionId");
CREATE UNIQUE INDEX "private_tables_inviteCode_key" ON "private_tables"("inviteCode");
CREATE INDEX "private_tables_inviteCode_idx" ON "private_tables"("inviteCode");

-- AlterTable: organizer_subscriptions
ALTER TABLE "organizer_subscriptions" ADD COLUMN "providerPaymentId" TEXT;

-- CreateTable
CREATE TABLE "private_table_seats" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PrivateTableSeatStatus" NOT NULL DEFAULT 'INVITED',
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_table_seats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "private_table_seats_tableId_userId_key" ON "private_table_seats"("tableId", "userId");
CREATE INDEX "private_table_seats_userId_idx" ON "private_table_seats"("userId");

ALTER TABLE "private_table_seats" ADD CONSTRAINT "private_table_seats_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "private_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "private_table_seats" ADD CONSTRAINT "private_table_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "private_table_seats" ADD CONSTRAINT "private_table_seats_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
