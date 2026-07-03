import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { MemberAppService } from './member-app.service';

@Controller('member-app-admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MemberAppAdminController {
  constructor(private readonly memberAppService: MemberAppService) {}

  @Get('settings')
  @Permissions('member_app.manage')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.memberAppService.getSettingsForAdmin(user.tenantId);
  }

  @Patch('settings')
  @Permissions('member_app.manage')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      enabled?: boolean;
      catalogEnabled?: boolean;
      showProductValues?: boolean;
      showApproxAvailability?: boolean;
      pointsEnabled?: boolean;
      allowProfileEdit?: boolean;
      digitalCardEnabled?: boolean;
      gamesEnabled?: boolean;
      missionsEnabled?: boolean;
      rewardsEnabled?: boolean;
      allowRewardRedemption?: boolean;
      requireRewardApproval?: boolean;
      maxDailyGamePlays?: number;
      maxDailyPointsFromGames?: number;
    },
  ) {
    return this.memberAppService.updateSettings(user.tenantId, body);
  }

  @Get('members/:memberId/points')
  @Permissions('member_app.points.view')
  getMemberPoints(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(Math.max(1, Number(limit) || 20), 100);

    return this.memberAppService.getMemberPointsForAdmin(
      user.tenantId,
      memberId,
      p,
      l,
    );
  }

  @Post('members/:memberId/points/adjust')
  @Permissions('member_app.points.adjust')
  adjustPoints(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body() body: { points: number; reason: string },
  ) {
    return this.memberAppService.adjustPoints(
      user.tenantId,
      memberId,
      body,
    );
  }

  // ── Rewards ──────────────────────────────────────────────────────────

  @Get('rewards')
  @Permissions('member_app.rewards.manage')
  getRewards(@CurrentUser() user: AuthUser) {
    return this.memberAppService.getRewardsAdmin(user.tenantId);
  }

  @Post('rewards')
  @Permissions('member_app.rewards.manage')
  createReward(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      description?: string;
      pointsCost: number;
      requiresApproval?: boolean;
      stockLimit?: number;
      imageUrl?: string;
      terms?: string;
    },
  ) {
    return this.memberAppService.createReward(user.tenantId, body);
  }

  @Patch('rewards/:id')
  @Permissions('member_app.rewards.manage')
  updateReward(
    @CurrentUser() user: AuthUser,
    @Param('id') rewardId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      pointsCost?: number;
      status?: string;
      requiresApproval?: boolean;
      stockLimit?: number;
      currentStock?: number;
      imageUrl?: string;
      terms?: string;
    },
  ) {
    return this.memberAppService.updateReward(user.tenantId, rewardId, body as any);
  }

  // ── Redemptions ──────────────────────────────────────────────────────

  @Get('redemptions')
  @Permissions('member_app.redemptions.review')
  getRedemptions(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(Math.max(1, Number(limit) || 20), 100);

    return this.memberAppService.getRedemptionsAdmin(
      user.tenantId,
      status as any,
      p,
      l,
      search,
    );
  }

  @Patch('redemptions/:id/approve')
  @Permissions('member_app.redemptions.review')
  approveRedemption(
    @CurrentUser() user: AuthUser,
    @Param('id') redemptionId: string,
  ) {
    return this.memberAppService.approveRedemption(
      user.tenantId,
      redemptionId,
      user.userId,
    );
  }

  @Patch('redemptions/:id/reject')
  @Permissions('member_app.redemptions.review')
  rejectRedemption(
    @CurrentUser() user: AuthUser,
    @Param('id') redemptionId: string,
    @Body() body: { notes?: string },
  ) {
    return this.memberAppService.rejectRedemption(
      user.tenantId,
      redemptionId,
      user.userId,
      body.notes,
    );
  }

  @Patch('redemptions/:id/deliver')
  @Permissions('member_app.redemptions.review')
  deliverRedemption(
    @CurrentUser() user: AuthUser,
    @Param('id') redemptionId: string,
  ) {
    return this.memberAppService.deliverRedemption(
      user.tenantId,
      redemptionId,
      user.userId,
    );
  }

  // ── Games ────────────────────────────────────────────────────────────

  @Get('games')
  @Permissions('member_app.games.manage')
  getGames(@CurrentUser() user: AuthUser) {
    return this.memberAppService.getGamesAdmin(user.tenantId);
  }

  @Post('games')
  @Permissions('member_app.games.manage')
  createGame(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      type: string;
      description?: string;
      pointsReward?: number;
      cooldownHours?: number;
      maxPlaysPerDay?: number;
      config?: Record<string, unknown>;
    },
  ) {
    return this.memberAppService.createGame(user.tenantId, body as any);
  }

  @Patch('games/:id')
  @Permissions('member_app.games.manage')
  updateGame(
    @CurrentUser() user: AuthUser,
    @Param('id') gameId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      type?: string;
      status?: string;
      pointsReward?: number;
      cooldownHours?: number;
      maxPlaysPerDay?: number;
      config?: Record<string, unknown>;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    return this.memberAppService.updateGame(user.tenantId, gameId, body as any);
  }

  // ── Missions ─────────────────────────────────────────────────────────

  @Get('missions')
  @Permissions('member_app.missions.manage')
  getMissions(@CurrentUser() user: AuthUser) {
    return this.memberAppService.getMissionsAdmin(user.tenantId);
  }

  @Post('missions')
  @Permissions('member_app.missions.manage')
  createMission(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      type: string;
      description?: string;
      pointsReward?: number;
      targetValue?: number;
    },
  ) {
    return this.memberAppService.createMission(user.tenantId, body as any);
  }

  @Patch('missions/:id')
  @Permissions('member_app.missions.manage')
  updateMission(
    @CurrentUser() user: AuthUser,
    @Param('id') missionId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      type?: string;
      status?: string;
      pointsReward?: number;
      targetValue?: number;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    return this.memberAppService.updateMission(user.tenantId, missionId, body as any);
  }
}
