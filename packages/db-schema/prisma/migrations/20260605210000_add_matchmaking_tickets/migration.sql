-- CreateTable
CREATE TABLE "matchmaking_tickets" (
    "userId" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchmaking_tickets_pkey" PRIMARY KEY ("userId")
);
