-- Phaser mini-games: new game types + game sessions

ALTER TYPE "RewardGameType" ADD VALUE 'BUBBLE_POP';
ALTER TYPE "RewardGameType" ADD VALUE 'MEMORY_CARDS';
ALTER TYPE "RewardGameType" ADD VALUE 'BLOCK_PUZZLE';
ALTER TYPE "RewardGameType" ADD VALUE 'RUNNER';
ALTER TYPE "RewardGameType" ADD VALUE 'REACTION_TAP';

CREATE TYPE "RewardGameSessionStatus" AS ENUM ('STARTED', 'FINISHED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "reward_game_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "RewardGameSessionStatus" NOT NULL DEFAULT 'STARTED',
    "seed" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reward_game_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reward_game_sessions_tenantId_memberId_createdAt_idx" ON "reward_game_sessions"("tenantId", "memberId", "createdAt" DESC);
CREATE INDEX "reward_game_sessions_tenantId_gameId_createdAt_idx" ON "reward_game_sessions"("tenantId", "gameId", "createdAt" DESC);
CREATE INDEX "reward_game_sessions_tenantId_status_idx" ON "reward_game_sessions"("tenantId", "status");

ALTER TABLE "reward_game_sessions" ADD CONSTRAINT "reward_game_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_game_sessions" ADD CONSTRAINT "reward_game_sessions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "reward_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_game_sessions" ADD CONSTRAINT "reward_game_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
