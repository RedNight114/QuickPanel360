import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ChatService } from './chat.service';
import { ChatMessagesQueryDto } from './dto/chat-query.dto';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import {
  AddChatParticipantsDto,
  UpdateChatParticipantRoleDto,
} from './dto/manage-participants.dto';
import { RegisterChatDeviceKeyDto } from './dto/register-device-key.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { MuteConversationDto } from './dto/update-conversation.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @Permissions('chat.view')
  findConversations(@CurrentUser() user: AuthUser) {
    return this.chatService.findConversations(user.tenantId, user.userId);
  }

  @Get('archived-conversations')
  @Permissions('chat.view')
  findArchivedConversations(@CurrentUser() user: AuthUser) {
    return this.chatService.findArchivedConversations(user.tenantId, user.userId);
  }

  @Get('collaborators')
  @Permissions('chat.view')
  findCollaborators(@CurrentUser() user: AuthUser) {
    return this.chatService.findCollaborators(user.tenantId, user.userId);
  }

  @Get('device-keys')
  @Permissions('chat.view')
  findDeviceKeys(@CurrentUser() user: AuthUser) {
    return this.chatService.findDeviceKeys(user.tenantId, user.userId);
  }

  @Post('device-keys')
  @Permissions('chat.view')
  registerDeviceKey(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterChatDeviceKeyDto,
  ) {
    return this.chatService.registerDeviceKey(user.tenantId, user.userId, dto);
  }

  @Delete('device-keys/:deviceId')
  @Permissions('chat.view')
  revokeDeviceKey(
    @CurrentUser() user: AuthUser,
    @Param('deviceId') deviceId: string,
  ) {
    return this.chatService.revokeDeviceKey(
      user.tenantId,
      user.userId,
      deviceId,
    );
  }

  @Post('conversations/direct')
  @Permissions('chat.create')
  createDirect(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.chatService.createDirectConversation(
      user.tenantId,
      user.userId,
      dto,
    );
  }

  @Post('conversations/group')
  @Permissions('chat.create')
  createGroup(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.chatService.createGroupConversation(
      user.tenantId,
      user.userId,
      dto,
    );
  }

  @Get('conversations/:id/messages/search')
  @Permissions('chat.view')
  searchMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('q') q: string,
    @Query('take') take?: string,
  ) {
    return this.chatService.searchMessages(
      user.tenantId,
      user.userId,
      id,
      q ?? '',
      take ? Math.min(parseInt(take, 10) || 20, 50) : 20,
    );
  }

  @Get('conversations/:id/messages')
  @Permissions('chat.view')
  findMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ChatMessagesQueryDto,
  ) {
    return this.chatService.findMessages(user.tenantId, user.userId, id, query);
  }

  @Get('conversations/:id/device-keys')
  @Permissions('chat.view')
  findConversationDeviceKeys(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.chatService.findConversationDeviceKeys(
      user.tenantId,
      user.userId,
      id,
    );
  }

  @Post('conversations/:id/messages')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Permissions('chat.send')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.tenantId, user.userId, id, dto);
  }

  @Post('conversations/:id/read')
  @Permissions('chat.view')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.markRead(user.tenantId, user.userId, id);
  }

  @Post('messages/:messageId/reactions')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Permissions('chat.send')
  toggleReaction(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.chatService.toggleReaction(user.tenantId, user.userId, messageId, dto);
  }

  @Patch('conversations/:id/archive')
  @Permissions('chat.view')
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.archiveConversation(user.tenantId, user.userId, id);
  }

  @Patch('conversations/:id/unarchive')
  @Permissions('chat.view')
  unarchive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.unarchiveConversation(user.tenantId, user.userId, id);
  }

  @Delete('conversations/:id')
  @Permissions('chat.view')
  deleteConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.deleteConversation(user.tenantId, user.userId, id);
  }

  @Patch('conversations/:id/mute')
  @Permissions('chat.view')
  mute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MuteConversationDto,
  ) {
    return this.chatService.muteConversation(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
  }

  @Delete('conversations/:id/leave')
  @Permissions('chat.view')
  leaveGroup(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.leaveGroup(user.tenantId, user.userId, id);
  }

  @Post('conversations/:id/participants')
  @Permissions('chat.manage')
  addParticipants(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddChatParticipantsDto,
  ) {
    return this.chatService.addParticipants(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
  }

  @Delete('conversations/:id/participants/:userId')
  @Permissions('chat.manage')
  removeParticipant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') participantUserId: string,
  ) {
    return this.chatService.removeParticipant(
      user.tenantId,
      user.userId,
      id,
      participantUserId,
    );
  }

  @Patch('conversations/:id/participants/:userId/role')
  @Permissions('chat.manage')
  updateParticipantRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') participantUserId: string,
    @Body() dto: UpdateChatParticipantRoleDto,
  ) {
    return this.chatService.updateParticipantRole(
      user.tenantId,
      user.userId,
      id,
      participantUserId,
      dto,
    );
  }

  @Patch('messages/:id/pin')
  @Permissions('chat.send')
  togglePin(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.togglePin(user.tenantId, user.userId, id);
  }

  @Get('conversations/:id/pinned')
  @Permissions('chat.view')
  findPinnedMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.findPinnedMessages(user.tenantId, user.userId, id);
  }

  @Patch('messages/:id')
  @Permissions('chat.send')
  editMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(user.tenantId, user.userId, id, dto);
  }

  @Delete('messages/:id')
  @Permissions('chat.send')
  deleteMessage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.deleteMessage(
      user.tenantId,
      user.userId,
      user.permissions,
      id,
    );
  }
}
