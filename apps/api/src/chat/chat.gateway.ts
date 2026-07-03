import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantAccessStatus, TenantStatus, UserRole } from '@prisma/client';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

type ChatSocket = Socket & {
  data: any & {
    user?: AuthUser;
  };
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: ChatSocket) {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = await this.jwtService.verifyAsync(token);

      const user: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        tenantId: payload.tenantId,
        tenantUserId: payload.tenantUserId,
        role: payload.role,
        permissions: payload.permissions ?? [],
        supportSessionId: payload.supportSessionId,
        impersonatedByUserId: payload.impersonatedByUserId,
      };

      const isSuperadmin = user.role === UserRole.SUPERADMIN;

      if (
        !isSuperadmin &&
        (!user.permissions.includes('chat.view') ||
        !(await this.canUseChat(user)))
      ) {
        client.disconnect(true);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.user = user;
      await client.join(this.userRoom(user.tenantId, user.userId));
      await client.join(this.tenantRoom(user.tenantId));

      if (isSuperadmin) {
        await client.join(this.userRoom('platform-admin-001', user.userId));
        await client.join(this.tenantRoom('platform-admin-001'));
      }
    } catch (error) {
      this.logger.warn(
        `Socket rechazado: ${error instanceof Error ? error.message : 'JWT inválido'}`,
      );
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:join')
  async joinConversation(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = client.data.user;
    if (!user || !body.conversationId) return;

    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        tenantId: user.tenantId,
        conversationId: body.conversationId,
        userId: user.userId,
      },
      select: { id: true },
    });

    if (!participant) {
      return;
    }

    client.join(this.conversationRoom(user.tenantId, body.conversationId));
  }

  @SubscribeMessage('chat:leave')
  leaveConversation(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const user = client.data.user;
    if (!user || !body.conversationId) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    client.leave(this.conversationRoom(user.tenantId, body.conversationId));
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { conversationId?: string; typing: boolean },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = client.data.user as AuthUser | undefined;
    if (!user || !body.conversationId) return;

    client.to(this.conversationRoom(user.tenantId, body.conversationId)).emit('chat:typing', {
      conversationId: body.conversationId,
      userId: user.userId,
      name: user.name,
      typing: body.typing,
    });
  }

  notifyConversation(params: {
    tenantId: string;
    conversationId: string;
    participantIds: string[];
    event: 'message.created' | 'message.deleted' | 'message.updated' | 'conversation.updated';
  }) {
    const payload = {
      conversationId: params.conversationId,
      event: params.event,
    };

    void this.server
      .to(this.conversationRoom(params.tenantId, params.conversationId))
      .emit('chat:event', payload);

    for (const userId of params.participantIds) {
      void this.server
        .to(this.userRoom(params.tenantId, userId))
        .emit('chat:event', payload);
    }
  }

  notifyMention(params: {
    tenantId: string;
    userId: string;
    conversationId: string;
    messageId: string;
    mentionedBy: string;
  }) {
    void this.server
      .to(this.userRoom(params.tenantId, params.userId))
      .emit('chat:mention', {
        conversationId: params.conversationId,
        messageId: params.messageId,
        mentionedBy: params.mentionedBy,
      });
  }

  notifyPlatformSupport(event: string, conversationId: string) {
    void this.server
      .to(this.tenantRoom('platform-admin-001'))
      .emit('chat:event', { conversationId, event });
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') return authToken;

    const authorization = client.handshake.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }

    return null;
  }

  private async canUseChat(user: AuthUser) {
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        status: true,
        accessStatus: true,
      },
    });

    if (
      !tenant ||
      tenant.status === TenantStatus.SUSPENDED ||
      tenant.status === TenantStatus.ARCHIVED ||
      tenant.accessStatus === TenantAccessStatus.EMERGENCY_LOCKED
    ) {
      return false;
    }

    const hasSupportChat = await this.prisma.chatConversation.count({
      where: {
        tenantId: user.tenantId,
        type: 'SUPPORT',
        participants: { some: { userId: user.userId } },
      },
    });
    if (hasSupportChat > 0) return true;

    const chatModule = await this.prisma.platformModuleDefinition.findUnique({
      where: { key: 'chat' },
      select: {
        tenants: {
          where: { tenantId: user.tenantId },
          select: { status: true },
          take: 1,
        },
      },
    });

    return chatModule?.tenants[0]?.status !== 'DISABLED';
  }

  private userRoom(tenantId: string, userId: string) {
    return `tenant:${tenantId}:user:${userId}`;
  }

  private tenantRoom(tenantId: string) {
    return `tenant:${tenantId}`;
  }

  private conversationRoom(tenantId: string, conversationId: string) {
    return `tenant:${tenantId}:conversation:${conversationId}`;
  }
}
