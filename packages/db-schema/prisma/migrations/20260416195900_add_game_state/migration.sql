-- AlterTable
ALTER TABLE "game_sessions" ADD COLUMN IF NOT EXISTS "gameState" JSONB;
