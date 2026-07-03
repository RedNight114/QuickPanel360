import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MemberAuthGuard } from '../member-app/member-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PushService } from './push.service';

interface MemberAuthRequest {
  memberAuth: { memberId: string; tenantId: string };
}

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidKey() {
    return this.pushService.getVapidPublicKey();
  }

  // ── Member portal ──────────────────────────────────────────────────────

  @Post('member/subscribe')
  @UseGuards(MemberAuthGuard)
  subscribeMember(
    @Req() req: MemberAuthRequest,
    @Body() body: { subscription: PushSubscriptionJSON },
  ) {
    return this.pushService.subscribeMember(
      req.memberAuth.tenantId,
      req.memberAuth.memberId,
      body.subscription,
    );
  }

  @Delete('member/unsubscribe')
  @UseGuards(MemberAuthGuard)
  unsubscribeMember(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribeMember(body.endpoint);
  }

  // ── Admin panel ────────────────────────────────────────────────────────

  @Post('admin/subscribe')
  @UseGuards(JwtAuthGuard)
  subscribeAdmin(
    @CurrentUser() user: AuthUser,
    @Body() body: { subscription: PushSubscriptionJSON },
  ) {
    return this.pushService.subscribeAdmin(user.userId, user.tenantId, body.subscription);
  }

  @Delete('admin/unsubscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribeAdmin(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribeAdmin(body.endpoint);
  }
}
