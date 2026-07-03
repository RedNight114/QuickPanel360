import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  ChatConversationType,
  ChatMessageType,
  ChatParticipantRole,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  TenantUserStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatCryptoService } from './chat-crypto.service';
import { ChatGateway } from './chat.gateway';

const PLATFORM_TENANT_ID = 'platform-admin-001';

@Injectable()
export class SupportChatService implements OnModuleInit {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatCrypto: ChatCryptoService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async onModuleInit() {
    await this.ensurePlatformTenant();
    await this.ensureSuperadminsInPlatformTenant();
  }

  private async ensurePlatformTenant() {
    try {
      const existing = await this.prisma.tenant.findUnique({
        where: { id: PLATFORM_TENANT_ID },
      });
      if (!existing) {
        await this.prisma.tenant.create({
          data: {
            id: PLATFORM_TENANT_ID,
            name: 'Platform Admin',
            status: 'ACTIVE',
            accessStatus: 'ENABLED',
          },
        });
        await this.prisma.tenantSettings.create({
          data: { tenantId: PLATFORM_TENANT_ID },
        });
        this.logger.log('Platform tenant created: ' + PLATFORM_TENANT_ID);
      }
    } catch (error) {
      this.logger.warn('Could not ensure platform tenant: ' + (error as Error).message);
    }
  }

  private async ensureSuperadminsInPlatformTenant() {
    try {
      const superadmins = await this.prisma.tenantUser.findMany({
        where: { role: UserRole.SUPERADMIN, status: TenantUserStatus.ACTIVE },
        select: { userId: true, tenantId: true },
      });

      for (const sa of superadmins) {
        if (sa.tenantId === PLATFORM_TENANT_ID) continue;

        const existsInPlatform = await this.prisma.tenantUser.findFirst({
          where: { userId: sa.userId, tenantId: PLATFORM_TENANT_ID },
        });

        if (!existsInPlatform) {
          await this.prisma.tenantUser.create({
            data: {
              tenantId: PLATFORM_TENANT_ID,
              userId: sa.userId,
              role: UserRole.SUPERADMIN,
              status: TenantUserStatus.ACTIVE,
            },
          });
          this.logger.log(`SUPERADMIN ${sa.userId} linked to platform tenant`);
        }
      }
    } catch (error) {
      this.logger.warn('Could not sync superadmins to platform tenant: ' + (error as Error).message);
    }
  }

  // ── Support conversations (club → platform) ──────────────────────

  async createSupportConversation(tenantId: string, userId: string) {
    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        tenantId,
        type: ChatConversationType.SUPPORT,
        participants: { some: { userId } },
      },
      select: { id: true },
    });

    if (existing) {
      return this.findConversationById(existing.id);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const conversation = await this.prisma.chatConversation.create({
      data: {
        tenantId,
        type: ChatConversationType.SUPPORT,
        title: `Soporte - ${tenant?.name ?? 'Club'}`,
        createdById: userId,
        participants: {
          create: {
            tenantId,
            userId,
            role: ChatParticipantRole.OWNER,
            lastReadAt: new Date(),
          },
        },
        messages: {
          create: {
            tenantId,
            senderId: null,
            type: ChatMessageType.SYSTEM,
            body: this.chatCrypto.encrypt('Chat de soporte iniciado. Un agente se asignara en breve.'),
          },
        },
      },
    });

    await this.notifySuperadmins(
      `Nuevo chat de soporte: ${tenant?.name ?? 'Club'}`,
      'Un club ha solicitado soporte. Revisa el chat de plataforma.',
      conversation.id,
    );

    this.chatGateway.notifyPlatformSupport('support.new', conversation.id);

    return this.findConversationById(conversation.id);
  }

  async assignSupportConversation(conversationId: string, adminUserId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, type: ChatConversationType.SUPPORT },
      include: { participants: { select: { userId: true } } },
    });

    if (!conversation) {
      throw new NotFoundException('Chat de soporte no encontrado');
    }

    if (conversation.assignedToId && conversation.assignedToId !== adminUserId) {
      throw new BadRequestException('Este chat ya esta asignado a otro agente');
    }

    const alreadyParticipant = conversation.participants.some(
      (p) => p.userId === adminUserId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { assignedToId: adminUserId },
      });

      if (!alreadyParticipant) {
        await tx.chatParticipant.create({
          data: {
            tenantId: conversation.tenantId,
            conversationId,
            userId: adminUserId,
            role: ChatParticipantRole.MEMBER,
            lastReadAt: new Date(),
          },
        });
      }

      await tx.chatMessage.create({
        data: {
          tenantId: conversation.tenantId,
          conversationId,
          senderId: null,
          type: ChatMessageType.SYSTEM,
          body: this.chatCrypto.encrypt('Un agente de soporte se ha unido.'),
        },
      });
    });

    const participants = await this.prisma.chatParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    this.chatGateway.notifyConversation({
      tenantId: conversation.tenantId,
      conversationId,
      participantIds: participants.map((p) => p.userId),
      event: 'message.created',
    });

    return this.findConversationById(conversationId);
  }

  async findSupportConversations() {
    const conversations = await this.prisma.chatConversation.findMany({
      where: { type: ChatConversationType.SUPPORT },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        tenant: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        participants: {
          select: {
            userId: true,
            role: true,
            user: { select: { id: true, name: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    return conversations.map((c) => ({
      ...c,
      lastMessage: null,
    }));
  }

  async findMySupportConversation(tenantId: string, userId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        tenantId,
        type: ChatConversationType.SUPPORT,
        participants: { some: { userId } },
      },
      select: { id: true },
    });

    if (!conversation) return null;
    return this.findConversationById(conversation.id);
  }

  // ── Platform internal conversations (admin ↔ admin) ──────────────

  async findPlatformCollaborators(userId: string) {
    const admins = await this.prisma.tenantUser.findMany({
      where: {
        tenantId: PLATFORM_TENANT_ID,
        role: UserRole.SUPERADMIN,
        status: TenantUserStatus.ACTIVE,
        userId: { not: userId },
        user: { status: UserStatus.ACTIVE },
      },
      select: {
        userId: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return admins;
  }

  async findPlatformConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: {
        tenantId: PLATFORM_TENANT_ID,
        type: ChatConversationType.DIRECT,
        participants: { some: { userId } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async createPlatformConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('No puedes chatear contigo mismo.');
    }

    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        tenantId: PLATFORM_TENANT_ID,
        type: ChatConversationType.DIRECT,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return this.findConversationById(existing.id);
    }

    const conversation = await this.prisma.chatConversation.create({
      data: {
        tenantId: PLATFORM_TENANT_ID,
        type: ChatConversationType.DIRECT,
        createdById: userId,
        participants: {
          createMany: {
            data: [
              { tenantId: PLATFORM_TENANT_ID, userId, role: ChatParticipantRole.OWNER, lastReadAt: new Date() },
              { tenantId: PLATFORM_TENANT_ID, userId: targetUserId, role: ChatParticipantRole.MEMBER },
            ],
          },
        },
        messages: {
          create: {
            tenantId: PLATFORM_TENANT_ID,
            senderId: null,
            type: ChatMessageType.SYSTEM,
            body: this.chatCrypto.encrypt('Conversacion iniciada.'),
          },
        },
      },
    });

    return this.findConversationById(conversation.id);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async findConversationById(id: string) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        participants: {
          select: {
            userId: true,
            role: true,
            lastReadAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    return conv;
  }

  private async notifySuperadmins(title: string, message: string, conversationId: string) {
    const admins = await this.prisma.tenantUser.findMany({
      where: {
        tenantId: PLATFORM_TENANT_ID,
        role: UserRole.SUPERADMIN,
        status: TenantUserStatus.ACTIVE,
        user: { status: UserStatus.ACTIVE },
      },
      select: { userId: true },
    });

    if (admins.length === 0) return;

    await this.prisma.internalNotification.createMany({
      data: admins.map((admin) => ({
        tenantId: PLATFORM_TENANT_ID,
        userId: admin.userId,
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.IMPORTANT,
        status: NotificationStatus.UNREAD,
        title,
        message,
        entityType: 'support_chat',
        entityId: conversationId,
        metadata: { path: '/platform/chat' },
      })),
    });
  }
}
