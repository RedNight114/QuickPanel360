-- Member Portal Phase 2: Games, Missions, Rewards

-- New settings fields
ALTER TABLE "member_app_settings" ADD COLUMN "gamesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "member_app_settings" ADD COLUMN "missionsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "member_app_settings" ADD COLUMN "rewardsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "member_app_settings" ADD COLUMN "allowRewardRedemption" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "member_app_settings" ADD COLUMN "requireRewardApproval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "member_app_settings" ADD COLUMN "maxDailyGamePlays" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "member_app_settings" ADD COLUMN "maxDailyPointsFromGames" INTEGER NOT NULL DEFAULT 50;

-- Enums
CREATE TYPE "RewardGameType" AS ENUM ('DAILY_CHECKIN', 'QUIZ', 'SPIN', 'SURVEY', 'CUSTOM');
CREATE TYPE "RewardGameStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "MissionType" AS ENUM ('COMPLETE_PROFILE', 'DAILY_ACCESS', 'QUIZ_PARTICIPATION', 'CHECK_IN', 'CUSTOM');
CREATE TYPE "MissionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "RewardStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "RewardRedemptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'DELIVERED', 'CANCELLED');

-- Games
CREATE TABLE "reward_games" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "RewardGameType" NOT NULL,
    "status" "RewardGameStatus" NOT NULL DEFAULT 'ACTIVE',
    "pointsReward" INTEGER NOT NULL DEFAULT 5,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "maxPlaysPerDay" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reward_games_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reward_game_plays" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "result" TEXT,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reward_game_plays_pkey" PRIMARY KEY ("id")
);

-- Missions
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MissionType" NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "pointsReward" INTEGER NOT NULL DEFAULT 25,
    "targetValue" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_mission_progress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_mission_progress_pkey" PRIMARY KEY ("id")
);

-- Rewards
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "stockLimit" INTEGER,
    "currentStock" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "RewardRedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "reward_games_tenantId_status_idx" ON "reward_games"("tenantId", "status");
CREATE INDEX "reward_game_plays_tenantId_memberId_createdAt_idx" ON "reward_game_plays"("tenantId", "memberId", "createdAt" DESC);
CREATE INDEX "reward_game_plays_tenantId_gameId_memberId_createdAt_idx" ON "reward_game_plays"("tenantId", "gameId", "memberId", "createdAt" DESC);
CREATE INDEX "missions_tenantId_status_idx" ON "missions"("tenantId", "status");
CREATE UNIQUE INDEX "member_mission_progress_tenantId_missionId_memberId_key" ON "member_mission_progress"("tenantId", "missionId", "memberId");
CREATE INDEX "member_mission_progress_tenantId_memberId_idx" ON "member_mission_progress"("tenantId", "memberId");
CREATE INDEX "rewards_tenantId_status_idx" ON "rewards"("tenantId", "status");
CREATE INDEX "reward_redemptions_tenantId_memberId_createdAt_idx" ON "reward_redemptions"("tenantId", "memberId", "createdAt" DESC);
CREATE INDEX "reward_redemptions_tenantId_status_createdAt_idx" ON "reward_redemptions"("tenantId", "status", "createdAt" DESC);

-- Foreign keys
ALTER TABLE "reward_games" ADD CONSTRAINT "reward_games_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_game_plays" ADD CONSTRAINT "reward_game_plays_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_game_plays" ADD CONSTRAINT "reward_game_plays_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "reward_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_game_plays" ADD CONSTRAINT "reward_game_plays_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "missions" ADD CONSTRAINT "missions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_mission_progress" ADD CONSTRAINT "member_mission_progress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_mission_progress" ADD CONSTRAINT "member_mission_progress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_mission_progress" ADD CONSTRAINT "member_mission_progress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
