import { Body, Controller, Post } from '@nestjs/common';
import { MemberAuthService } from './member-auth.service';

@Controller('member-auth')
export class MemberAuthController {
  constructor(private readonly memberAuthService: MemberAuthService) {}

  @Post('request-access')
  requestAccess(@Body() body: { tenantId: string; email: string }) {
    return this.memberAuthService.requestAccess(body.tenantId, body.email);
  }

  @Post('login')
  login(@Body() body: { tenantId: string; email: string; code: string }) {
    return this.memberAuthService.login(
      body.tenantId,
      body.email,
      body.code,
    );
  }
}
