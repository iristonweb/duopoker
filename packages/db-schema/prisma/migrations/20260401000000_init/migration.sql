-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'BLACK');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'LOBBY', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('HOLDEM', 'JOKER');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'APPLE_IAP', 'GOOGLE_PLAY', 'YOOKASSA');

-- CreateEnum
CREATE TYPE "PrivateTableSeatStatus" AS ENUM ('INVITED', 'ACCEPTED', 'SEATED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ClubVisibility" AS ENUM ('PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "PrivateTableStatus" AS ENUM ('SCHEDULED', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrganizerPlanTier" AS ENUM ('BASIC', 'PRO', 'NETWORK');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "PlatformDuelStatus" AS ENUM ('PENDING', 'LIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlatformDuelInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "tableStatus" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "verificationToken" TEXT,
    "verificationTokenExpiresAt" TIMESTAMP(3),
    "chips" INTEGER NOT NULL DEFAULT 10000,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "status" "Status" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "status" "Status" NOT NULL,
    "players" TEXT[],
    "buyIn" INTEGER NOT NULL,
    "rake" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "gameState" JSONB,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchmaking_tickets" (
    "userId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchmaking_tickets_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "match_assignments" (
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_assignments_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "hands" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "cards" TEXT[],
    "actions" JSONB NOT NULL,
    "winnerId" TEXT,
    "pot" INTEGER NOT NULL,

    CONSTRAINT "hands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replay_meta" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "replay_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
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

-- CreateTable
CREATE TABLE "club_memberships" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_tables" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "status" "PrivateTableStatus" NOT NULL DEFAULT 'SCHEDULED',
    "maxPlayers" INTEGER NOT NULL DEFAULT 9,
    "virtualBuyIn" INTEGER NOT NULL DEFAULT 1000,
    "sessionId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startsAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "private_tables_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "organizer_subscriptions" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tier" "OrganizerPlanTier" NOT NULL,
    "status" "Status" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "billingProvider" "PaymentProvider" NOT NULL,
    "providerSubscriptionId" TEXT,
    "providerPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_events" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_duels" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "message" TEXT,
    "mode" "Mode" NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "sessionId" TEXT,
    "status" "PlatformDuelStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),

    CONSTRAINT "platform_duels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "handsPlayed" INTEGER NOT NULL DEFAULT 0,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_reward_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "chips" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_duel_invites" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlatformDuelInviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "platform_duel_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE INDEX "match_assignments_sessionId_idx" ON "match_assignments"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_refreshToken_key" ON "device_sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_providerEventId_key" ON "payment_events"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "replay_meta_sessionId_key" ON "replay_meta"("sessionId");

-- CreateIndex
CREATE INDEX "clubs_ownerId_idx" ON "clubs"("ownerId");

-- CreateIndex
CREATE INDEX "club_memberships_userId_idx" ON "club_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_clubId_userId_key" ON "club_memberships"("clubId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "private_tables_sessionId_key" ON "private_tables"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "private_tables_inviteCode_key" ON "private_tables"("inviteCode");

-- CreateIndex
CREATE INDEX "private_tables_clubId_status_idx" ON "private_tables"("clubId", "status");

-- CreateIndex
CREATE INDEX "private_tables_inviteCode_idx" ON "private_tables"("inviteCode");

-- CreateIndex
CREATE INDEX "private_table_seats_userId_idx" ON "private_table_seats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "private_table_seats_tableId_userId_key" ON "private_table_seats"("tableId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_subscriptions_clubId_key" ON "organizer_subscriptions"("clubId");

-- CreateIndex
CREATE INDEX "organizer_subscriptions_ownerId_idx" ON "organizer_subscriptions"("ownerId");

-- CreateIndex
CREATE INDEX "compliance_events_clubId_createdAt_idx" ON "compliance_events"("clubId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_duels_sessionId_key" ON "platform_duels"("sessionId");

-- CreateIndex
CREATE INDEX "platform_duels_hostId_status_idx" ON "platform_duels"("hostId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredId_key" ON "referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_status_idx" ON "referrals"("referrerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "referral_reward_claims_userId_level_key" ON "referral_reward_claims"("userId", "level");

-- CreateIndex
CREATE INDEX "platform_duel_invites_userId_status_idx" ON "platform_duel_invites"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_duel_invites_duelId_userId_key" ON "platform_duel_invites"("duelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hands" ADD CONSTRAINT "hands_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replay_meta" ADD CONSTRAINT "replay_meta_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_tables" ADD CONSTRAINT "private_tables_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_table_seats" ADD CONSTRAINT "private_table_seats_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "private_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_table_seats" ADD CONSTRAINT "private_table_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_table_seats" ADD CONSTRAINT "private_table_seats_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_subscriptions" ADD CONSTRAINT "organizer_subscriptions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_events" ADD CONSTRAINT "compliance_events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_duels" ADD CONSTRAINT "platform_duels_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_reward_claims" ADD CONSTRAINT "referral_reward_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_duel_invites" ADD CONSTRAINT "platform_duel_invites_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "platform_duels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_duel_invites" ADD CONSTRAINT "platform_duel_invites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

