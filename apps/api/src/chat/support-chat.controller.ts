import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { SupportChatService } from './support-chat.service';

function assertSuperadmin(user: AuthUser) {
  if (user.role !== UserRole.SUPERADMIN) {
    throw new ForbiddenException('Acceso restringido a administradores.');
  }
}

@Controller('chat/support')
@UseGuards(JwtAuthGuard)
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Post()
  createSupportChat(@CurrentUser() user: AuthUser) {
    return this.supportChatService.createSupportConversation(
      user.tenantId,
      user.userId,
    );
  }

  @Get('mine')
  findMySupportChat(@CurrentUser() user: AuthUser) {
    return this.supportChatService.findMySupportConversation(
      user.tenantId,
      user.userId,
    );
  }

  @Get('all')
  findAllSupportChats(@CurrentUser() user: AuthUser) {
    assertSuperadmin(user);
    return this.supportChatService.findSupportConversations();
  }

  @Patch(':id/assign')
  assignSupportChat(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    assertSuperadmin(user);
    return this.supportChatService.assignSupportConversation(id, user.userId);
  }

  @Get('platform/collaborators')
  findPlatformCollaborators(@CurrentUser() user: AuthUser) {
    assertSuperadmin(user);
    return this.supportChatService.findPlatformCollaborators(user.userId);
  }

  @Get('platform/conversations')
  findPlatformConversations(@CurrentUser() user: AuthUser) {
    assertSuperadmin(user);
    return this.supportChatService.findPlatformConversations(user.userId);
  }

  @Post('platform/conversations')
  createPlatformConversation(
    @CurrentUser() user: AuthUser,
    @Body() body: { userId: string },
  ) {
    assertSuperadmin(user);
    return this.supportChatService.createPlatformConversation(
      user.userId,
      body.userId,
    );
  }
}
