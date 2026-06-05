-- Persist match results so both queued players discover the same session (REST polling).
CREATE TABLE IF NOT EXISTS "match_assignments" (
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_assignments_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX IF NOT EXISTS "match_assignments_sessionId_idx" ON "match_assignments"("sessionId");
