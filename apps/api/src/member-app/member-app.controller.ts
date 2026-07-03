import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MemberAuthGuard } from './member-auth.guard';
import { MemberAppService } from './member-app.service';

interface MemberAuthRequest {
  memberAuth: { memberId: string; tenantId: string };
}

@Controller('member-app')
@UseGuards(MemberAuthGuard)
export class MemberAppController {
  constructor(private readonly memberAppService: MemberAppService) {}

  @Get('home')
  getHome(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getHome(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  @Get('profile')
  getProfile(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getProfile(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  @Patch('profile')
  updateProfile(
    @Req() req: MemberAuthRequest,
    @Body() body: { phone?: string; email?: string },
  ) {
    return this.memberAppService.updateProfile(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      body,
    );
  }

  @Get('card')
  getCard(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getCard(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  @Get('catalog')
  getCatalog(
    @Req() req: MemberAuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(Math.max(1, Number(limit) || 20), 100);

    return this.memberAppService.getCatalog(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      p,
      l,
      search,
    );
  }

  @Get('points')
  getPoints(
    @Req() req: MemberAuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(Math.max(1, Number(limit) || 20), 100);

    return this.memberAppService.getPoints(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      p,
      l,
    );
  }

  @Post('points/check-in')
  checkIn(@Req() req: MemberAuthRequest) {
    return this.memberAppService.checkIn(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  // ── Games ────────────────────────────────────────────────────────────

  @Get('games')
  getGames(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getGames(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  @Post('games/:id/play')
  playGame(
    @Req() req: MemberAuthRequest,
    @Param('id') gameId: string,
    @Body() body: { result?: string; answer?: string },
  ) {
    return this.memberAppService.playGame(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      gameId,
      body.result ?? body.answer,
    );
  }

  @Get('leaderboard')
  getLeaderboard(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getLeaderboard(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  @Get('games/:id/history')
  getGameHistory(
    @Req() req: MemberAuthRequest,
    @Param('id') gameId: string,
  ) {
    return this.memberAppService.getGameHistory(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      gameId,
    );
  }

  @Post('games/:id/start')
  startGameSession(
    @Req() req: MemberAuthRequest,
    @Param('id') gameId: string,
  ) {
    return this.memberAppService.startGameSession(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      gameId,
    );
  }

  @Post('games/sessions/:sessionId/finish')
  finishGameSession(
    @Req() req: MemberAuthRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: { score: number },
  ) {
    return this.memberAppService.finishGameSession(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      sessionId,
      body.score,
    );
  }

  // ── Missions ─────────────────────────────────────────────────────────

  @Get('missions')
  getMissions(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getMissions(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  // ── Rewards ──────────────────────────────────────────────────────────

  @Get('rewards')
  getRewards(@Req() req: MemberAuthRequest) {
    return this.memberAppService.getRewards(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
    );
  }

  @Post('rewards/:id/redeem')
  redeemReward(
    @Req() req: MemberAuthRequest,
    @Param('id') rewardId: string,
  ) {
    return this.memberAppService.redeemReward(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      rewardId,
    );
  }

  // ── Redemptions ──────────────────────────────────────────────────────

  @Get('redemptions')
  getRedemptions(
    @Req() req: MemberAuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(Math.max(1, Number(limit) || 20), 100);

    return this.memberAppService.getRedemptions(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      p,
      l,
    );
  }
}
