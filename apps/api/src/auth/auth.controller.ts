import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import type { AuthUser } from './types/auth-user.type';
import { AuthService } from './auth.service';
import { TotpService } from './totp.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly totpService: TotpService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  getSessions(@CurrentUser() user: AuthUser) {
    return this.authService.getSessions(user.userId, user.tenantId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.authService.revokeSession(user.userId, user.tenantId, id);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  revokeAllOtherSessions(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const token = (req.headers.authorization ?? '').replace('Bearer ', '');
    return this.authService.revokeAllOtherSessions(user.userId, user.tenantId, token);
  }

  // ── TOTP / 2FA ───────────────────────────────────────────────────────

  @Get('totp/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async getTotpStatus(@CurrentUser() user: AuthUser) {
    return this.totpService.getStatus(user.userId);
  }

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.totpService.setupTotp(user.userId);
  }

  @Post('totp/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  verifyAndEnable(@CurrentUser() user: AuthUser, @Body() body: { code: string }) {
    return this.totpService.verifyAndEnable(user.userId, body.code);
  }

  @Post('totp/disable')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  disableTotp(@CurrentUser() user: AuthUser, @Body() body: { code: string }) {
    return this.totpService.disable(user.userId, body.code);
  }
}
