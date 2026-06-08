-- Organizer billing lifecycle
CREATE TYPE "OrganizerBillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

ALTER TABLE "organizer_subscriptions" ADD COLUMN "billingStatus" "OrganizerBillingStatus" NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX "organizer_subscriptions_billingStatus_idx" ON "organizer_subscriptions"("billingStatus");

-- Platform-level compliance reports (nullable club)
ALTER TABLE "compliance_events" ALTER COLUMN "clubId" DROP NOT NULL;
ALTER TABLE "compliance_events" ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE INDEX "compliance_events_severity_createdAt_idx" ON "compliance_events"("severity", "createdAt");

-- Account deletion requests
CREATE TABLE "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_deletion_requests_userId_status_idx" ON "account_deletion_requests"("userId", "status");
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Club usage snapshots
CREATE TABLE "club_usage_snapshots" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "activeTableCount" INTEGER NOT NULL,
    "billingCycleStart" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "club_usage_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "club_usage_snapshots_clubId_billingCycleStart_idx" ON "club_usage_snapshots"("clubId", "billingCycleStart");
ALTER TABLE "club_usage_snapshots" ADD CONSTRAINT "club_usage_snapshots_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotency keys for checkout / plan change
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- One OWNER per club: demote extras to ADMIN (keep earliest joinedAt), then enforce partial unique index
UPDATE "club_memberships" AS cm
SET "role" = 'ADMIN'
WHERE cm."role" = 'OWNER'
  AND cm."id" NOT IN (
    SELECT DISTINCT ON ("clubId") "id"
    FROM "club_memberships"
    WHERE "role" = 'OWNER'
    ORDER BY "clubId", "joinedAt" ASC
  );

CREATE UNIQUE INDEX "club_memberships_one_owner_per_club" ON "club_memberships"("clubId") WHERE "role" = 'OWNER';
