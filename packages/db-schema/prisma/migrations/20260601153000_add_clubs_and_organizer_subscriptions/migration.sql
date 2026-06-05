-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClubVisibility" AS ENUM ('PRIVATE', 'INVITE_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PrivateTableStatus" AS ENUM ('SCHEDULED', 'LIVE', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrganizerPlanTier" AS ENUM ('BASIC', 'PRO', 'NETWORK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "clubs" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "visibility" "ClubVisibility" NOT NULL DEFAULT 'PRIVATE',
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "maxMembers" INTEGER NOT NULL DEFAULT 30,
  "maxActiveTables" INTEGER NOT NULL DEFAULT 2,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "club_memberships" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "private_tables" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "hostUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mode" "Mode" NOT NULL,
  "status" "PrivateTableStatus" NOT NULL DEFAULT 'SCHEDULED',
  "maxPlayers" INTEGER NOT NULL DEFAULT 9,
  "virtualBuyIn" INTEGER NOT NULL DEFAULT 1000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startsAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "private_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organizer_subscriptions" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "tier" "OrganizerPlanTier" NOT NULL,
  "status" "Status" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "billingProvider" "PaymentProvider" NOT NULL,
  "providerSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizer_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "compliance_events" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_memberships_clubId_userId_key" ON "club_memberships"("clubId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_subscriptions_clubId_key" ON "organizer_subscriptions"("clubId");
CREATE INDEX IF NOT EXISTS "clubs_ownerId_idx" ON "clubs"("ownerId");
CREATE INDEX IF NOT EXISTS "club_memberships_userId_idx" ON "club_memberships"("userId");
CREATE INDEX IF NOT EXISTS "private_tables_clubId_status_idx" ON "private_tables"("clubId", "status");
CREATE INDEX IF NOT EXISTS "organizer_subscriptions_ownerId_idx" ON "organizer_subscriptions"("ownerId");
CREATE INDEX IF NOT EXISTS "compliance_events_clubId_createdAt_idx" ON "compliance_events"("clubId", "createdAt");

ALTER TABLE "clubs"
  ADD CONSTRAINT "clubs_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "club_memberships"
  ADD CONSTRAINT "club_memberships_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "club_memberships"
  ADD CONSTRAINT "club_memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "private_tables"
  ADD CONSTRAINT "private_tables_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organizer_subscriptions"
  ADD CONSTRAINT "organizer_subscriptions_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_events"
  ADD CONSTRAINT "compliance_events_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
