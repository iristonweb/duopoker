-- CreateEnum
CREATE TYPE "PlatformDuelStatus" AS ENUM ('PENDING', 'LIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlatformDuelInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

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
CREATE TABLE "platform_duel_invites" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlatformDuelInviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "platform_duel_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_duels_sessionId_key" ON "platform_duels"("sessionId");

-- CreateIndex
CREATE INDEX "platform_duels_hostId_status_idx" ON "platform_duels"("hostId", "status");

-- CreateIndex
CREATE INDEX "platform_duel_invites_userId_status_idx" ON "platform_duel_invites"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_duel_invites_duelId_userId_key" ON "platform_duel_invites"("duelId", "userId");

-- AddForeignKey
ALTER TABLE "platform_duels" ADD CONSTRAINT "platform_duels_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_duel_invites" ADD CONSTRAINT "platform_duel_invites_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "platform_duels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_duel_invites" ADD CONSTRAINT "platform_duel_invites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
