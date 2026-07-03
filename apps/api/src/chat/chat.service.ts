import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatConversationType,
  ChatMessageType,
  ChatParticipantRole,
  Prisma,
  TenantUserStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatCryptoService } from './chat-crypto.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessagesQueryDto } from './dto/chat-query.dto';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import {
  AddChatParticipantsDto,
  UpdateChatParticipantRoleDto,
} from './dto/manage-participants.dto';
import { RegisterChatDeviceKeyDto } from './dto/register-device-key.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { MuteConversationDto } from './dto/update-conversation.dto';

const participantInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.ChatParticipantInclude;

@Injectable()
export class ChatService {
  private readonly retentionCache = new Map<string, number>();
  private static readonly RETENTION_TTL_MS = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly chatGateway: ChatGateway,
    private readonly chatCrypto: ChatCryptoService,
    private readonly configService: ConfigService,
  ) {}

  async findConversations(tenantId: string, userId: string) {
    await this.applyRetentionPolicy(tenantId);

    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        tenantId,
        participants: {
          some: {
            tenantId,
            userId,
            archived: false,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        participants: {
          include: participantInclude,
          orderBy: { createdAt: 'asc' },
        },
        messages: {
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const unreadCounts = await this.countUnreadMessagesByConversation(
      tenantId,
      userId,
      conversations.map((conversation) => ({
        conversationId: conversation.id,
        lastReadAt:
          conversation.participants.find(
            (participant) => participant.userId === userId,
          )?.lastReadAt ?? null,
      })),
    );

    return conversations.map((conversation) =>
      this.toConversationResponse(
        conversation,
        unreadCounts.get(conversation.id) ?? 0,
      ),
    );
  }

  async findCollaborators(tenantId: string, currentUserId: string) {
    const collaborators = await this.prisma.tenantUser.findMany({
      where: {
        tenantId,
        status: TenantUserStatus.ACTIVE,
        userId: { not: currentUserId },
        role: {
          in: [UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE],
        },
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
      select: {
        userId: true,
        role: true,
        status: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return collaborators.map((item) => ({
      userId: item.userId,
      name: item.user.name,
      email: item.user.email,
      role: item.role,
      status: item.status,
    }));
  }

  findDeviceKeys(tenantId: string, userId: string) {
    return this.prisma.chatDeviceKey.findMany({
      where: {
        tenantId,
        userId,
        active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        userAgent: true,
        publicKey: true,
        algorithm: true,
        active: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
  }

  registerDeviceKey(
    tenantId: string,
    userId: string,
    dto: RegisterChatDeviceKeyDto,
  ) {
    return this.prisma.chatDeviceKey.upsert({
      where: {
        tenantId_userId_deviceId: {
          tenantId,
          userId,
          deviceId: dto.deviceId,
        },
      },
      update: {
        publicKey: dto.publicKey,
        algorithm: dto.algorithm ?? 'ECDH-P256',
        deviceName: dto.deviceName,
        userAgent: dto.userAgent,
        active: true,
        lastSeenAt: new Date(),
      },
      create: {
        tenantId,
        userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        userAgent: dto.userAgent,
        publicKey: dto.publicKey,
        algorithm: dto.algorithm ?? 'ECDH-P256',
        active: true,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        userAgent: true,
        publicKey: true,
        algorithm: true,
        active: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
  }

  async revokeDeviceKey(tenantId: string, userId: string, deviceId: string) {
    const key = await this.prisma.chatDeviceKey.findFirst({
      where: {
        tenantId,
        userId,
        deviceId,
        active: true,
      },
      select: {
        id: true,
        deviceId: true,
        algorithm: true,
      },
    });

    if (!key) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.chatDeviceKey.update({
        where: { id: key.id },
        data: {
          active: false,
          lastSeenAt: new Date(),
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.device_key_revoked',
        entityType: 'chat_device_key',
        entityId: key.id,
        oldValue: {
          deviceId: key.deviceId,
          algorithm: key.algorithm,
          active: true,
        },
        newValue: {
          deviceId: key.deviceId,
          algorithm: key.algorithm,
          active: false,
        },
      });
    });

    return { ok: true };
  }

  async createDirectConversation(
    tenantId: string,
    userId: string,
    dto: CreateDirectConversationDto,
  ) {
    if (dto.userId === userId) {
      throw new BadRequestException('No puedes iniciar un chat contigo mismo.');
    }

    await Promise.all([
      this.ensureTenantUser(tenantId, userId),
      this.ensureTenantUser(tenantId, dto.userId),
    ]);

    const existing = await this.findExistingDirectConversation(
      tenantId,
      userId,
      dto.userId,
    );

    if (existing) {
      return this.findConversationOrThrow(tenantId, userId, existing.id);
    }

    const conversation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatConversation.create({
        data: {
          tenantId,
          type: ChatConversationType.DIRECT,
          createdById: userId,
          participants: {
            create: [
              {
                tenantId,
                userId,
                role: ChatParticipantRole.OWNER,
                lastReadAt: new Date(),
              },
              {
                tenantId,
                userId: dto.userId,
                role: ChatParticipantRole.MEMBER,
              },
            ],
          },
          messages: {
            create: {
              tenantId,
              type: ChatMessageType.SYSTEM,
              body: 'Conversación iniciada.',
            },
          },
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.conversation_created',
        entityType: 'chat_conversation',
        entityId: created.id,
        newValue: {
          type: ChatConversationType.DIRECT,
          participantCount: 2,
        },
      });

      return created;
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversation.id,
      'conversation.updated',
    );

    return this.findConversationOrThrow(tenantId, userId, conversation.id);
  }

  async createGroupConversation(
    tenantId: string,
    userId: string,
    dto: CreateGroupConversationDto,
  ) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('El título del grupo es obligatorio.');
    }

    const participantIds = Array.from(new Set([userId, ...dto.participantIds]));
    if (participantIds.length < 2) {
      throw new BadRequestException('Selecciona al menos otro participante.');
    }

    await Promise.all(
      participantIds.map((participantId) =>
        this.ensureTenantUser(tenantId, participantId),
      ),
    );

    const conversation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatConversation.create({
        data: {
          tenantId,
          type: ChatConversationType.GROUP,
          title,
          createdById: userId,
          participants: {
            create: participantIds.map((participantId) => ({
              tenantId,
              userId: participantId,
              role:
                participantId === userId
                  ? ChatParticipantRole.OWNER
                  : ChatParticipantRole.MEMBER,
              lastReadAt: participantId === userId ? new Date() : undefined,
            })),
          },
          messages: {
            create: {
              tenantId,
              type: ChatMessageType.SYSTEM,
              body: 'Grupo creado.',
            },
          },
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.group_created',
        entityType: 'chat_conversation',
        entityId: created.id,
        newValue: {
          type: ChatConversationType.GROUP,
          participantCount: participantIds.length,
        },
      });

      return created;
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversation.id,
      'conversation.updated',
    );

    return this.findConversationOrThrow(tenantId, userId, conversation.id);
  }

  async searchMessages(
    tenantId: string,
    userId: string,
    conversationId: string,
    q: string,
    take: number,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    const normalizedQ = q.trim().toLowerCase();
    if (!normalizedQ) return [];

    const batchSize = 200;
    const maxBatches = 3;
    const results: ReturnType<typeof this.toMessageResponse>[] = [];
    let cursor: string | undefined;

    for (let batch = 0; batch < maxBatches && results.length < take; batch++) {
      const messages = await this.prisma.chatMessage.findMany({
        where: {
          tenantId,
          conversationId,
          type: ChatMessageType.TEXT,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include: {
          sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
          reactions: { select: { id: true, userId: true, emoji: true, user: { select: { name: true } } } },
          replyTo: {
            select: {
              id: true, body: true, senderId: true, deletedAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
          mentions: { select: { userId: true, user: { select: { name: true } } } },
        } as unknown as Prisma.ChatMessageInclude,
      });

      if (messages.length === 0) break;
      cursor = messages[messages.length - 1].id;

      for (const msg of messages) {
        const decrypted = this.chatCrypto.decrypt(msg.body);
        if (decrypted.toLowerCase().includes(normalizedQ)) {
          results.push(this.toMessageResponse({ ...(msg as any), body: msg.body }));
          if (results.length >= take) break;
        }
      }
    }

    return results;
  }

  async findMessages(
    tenantId: string,
    userId: string,
    conversationId: string,
    query: ChatMessagesQueryDto,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);
    await this.applyRetentionPolicy(tenantId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        tenantId,
        conversationId,
        ...(query.cursor
          ? {
              createdAt: {
                lt: new Date(query.cursor),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.take ?? 50,
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reactions: {
          select: {
            id: true, userId: true, emoji: true,
            user: { select: { name: true } },
          },
        },
        replyTo: {
          select: {
            id: true,
            body: true,
            senderId: true,
            deletedAt: true,
            sender: { select: { id: true, name: true } },
          },
        },
        mentions: { select: { userId: true, user: { select: { name: true } } } },
      } as unknown as Prisma.ChatMessageInclude,
    });

    return messages.reverse().map((message) => this.toMessageResponse(message as any));
  }

  async findConversationDeviceKeys(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    return this.prisma.chatDeviceKey.findMany({
      where: {
        tenantId,
        active: true,
        user: {
          chatParticipants: {
            some: {
              tenantId,
              conversationId,
              archived: false,
            },
          },
        },
      },
      orderBy: [{ userId: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        userId: true,
        deviceId: true,
        deviceName: true,
        publicKey: true,
        algorithm: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
  }

  async sendMessage(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('El mensaje no puede estar vacío.');
    }

    // Resolve participants to match @name mentions
    const participants = await this.prisma.chatParticipant.findMany({
      where: { conversationId, tenantId },
      select: { userId: true, user: { select: { id: true, name: true } } },
    });

    const mentionedUserIds = this.resolveMentions(body, participants.map((p) => p.user));

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          tenantId,
          conversationId,
          senderId: userId,
          type: ChatMessageType.TEXT,
          body: this.chatCrypto.encrypt(body),
          ...(dto.clientEncryptedPayload
            ? { clientEncryptedPayload: dto.clientEncryptedPayload as Prisma.InputJsonObject }
            : {}),
          ...(dto.replyToId ? { replyToId: dto.replyToId } : {}),
        },
        include: {
          sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
          reactions: { select: { id: true, userId: true, emoji: true, user: { select: { name: true } } } },
          replyTo: {
            select: {
              id: true, body: true, senderId: true, deletedAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (mentionedUserIds.length > 0) {
        await (tx as any).chatMessageMention.createMany({
          data: mentionedUserIds.map((uid) => ({
            tenantId,
            messageId: created.id,
            userId: uid,
          })),
          skipDuplicates: true,
        });
      }

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversationId,
      'message.created',
    );

    // Notify mentioned users specifically
    for (const uid of mentionedUserIds) {
      if (uid !== userId) {
        this.chatGateway.notifyMention({
          tenantId,
          userId: uid,
          conversationId,
          messageId: message.id,
          mentionedBy: (message as any).sender?.name ?? 'Alguien',
        });
      }
    }

    return this.toMessageResponse(message as any);
  }

  async markRead(tenantId: string, userId: string, conversationId: string) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    await this.prisma.chatParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return { ok: true };
  }

  async findArchivedConversations(tenantId: string, userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        tenantId,
        participants: {
          some: { tenantId, userId, archived: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: participantInclude,
          orderBy: { createdAt: 'asc' },
        },
        messages: {
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    const unreadCounts = await this.countUnreadMessagesByConversation(
      tenantId,
      userId,
      conversations.map((conversation) => ({
        conversationId: conversation.id,
        lastReadAt:
          conversation.participants.find(
            (participant) => participant.userId === userId,
          )?.lastReadAt ?? null,
      })),
    );

    return conversations.map((conversation) =>
      this.toConversationResponse(
        conversation,
        unreadCounts.get(conversation.id) ?? 0,
      ),
    );
  }

  async archiveConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    await this.prisma.chatParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archived: true },
    });

    return { ok: true };
  }

  async unarchiveConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    await this.prisma.chatParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archived: false },
    });

    return { ok: true };
  }

  async deleteConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        participants: { select: { userId: true, role: true } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversación no encontrada.');

    const participant = conversation.participants.find((p) => p.userId === userId);
    if (!participant) throw new ForbiddenException('No eres participante de esta conversación.');

    // Only owners or the creator can delete
    const isConvOwner = participant.role === 'OWNER';
    const isCreator = conversation.createdById === userId;
    if (!isConvOwner && !isCreator) {
      throw new ForbiddenException('Solo el propietario o creador del chat puede eliminarlo.');
    }

    await this.prisma.chatConversation.delete({ where: { id: conversationId } });

    return { ok: true };
  }

  async muteConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: MuteConversationDto,
  ) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    await this.prisma.chatParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        muted: dto.muted,
      },
    });

    return { ok: true };
  }

  async leaveGroup(tenantId: string, userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        type: ChatConversationType.GROUP,
      },
      select: {
        id: true,
        participants: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Grupo no encontrado.');
    }

    const participant = conversation.participants.find(
      (item) => item.userId === userId,
    );

    if (!participant) {
      throw new ForbiddenException('No participas en este grupo.');
    }

    if (conversation.participants.length <= 2) {
      throw new BadRequestException(
        'El grupo debe mantener al menos dos participantes.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.chatParticipant.delete({
        where: { id: participant.id },
      });

      await tx.chatMessage.create({
        data: {
          tenantId,
          conversationId,
          type: ChatMessageType.SYSTEM,
          body: 'Un participante salió del grupo.',
        },
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.conversation_member_left',
        entityType: 'chat_conversation',
        entityId: conversationId,
        newValue: {
          participantCount: conversation.participants.length - 1,
        },
      });
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversationId,
      'conversation.updated',
    );

    return { ok: true };
  }

  async addParticipants(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: AddChatParticipantsDto,
  ) {
    await this.ensureGroupManager(tenantId, userId, conversationId);

    const userIds = Array.from(new Set(dto.userIds)).filter(
      (id) => id !== userId,
    );
    if (!userIds.length) {
      throw new BadRequestException('Selecciona colaboradores para añadir.');
    }

    await Promise.all(userIds.map((id) => this.ensureTenantUser(tenantId, id)));

    const existingParticipants = await this.prisma.chatParticipant.findMany({
      where: {
        tenantId,
        conversationId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });
    const existingIds = new Set(
      existingParticipants.map((participant) => participant.userId),
    );
    const newUserIds = userIds.filter((id) => !existingIds.has(id));

    if (!newUserIds.length) {
      return this.findConversationOrThrow(tenantId, userId, conversationId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.chatParticipant.createMany({
        data: newUserIds.map((participantUserId) => ({
          tenantId,
          conversationId,
          userId: participantUserId,
          role: ChatParticipantRole.MEMBER,
        })),
        skipDuplicates: true,
      });

      await tx.chatMessage.create({
        data: {
          tenantId,
          conversationId,
          type: ChatMessageType.SYSTEM,
          body: 'Se añadieron participantes al grupo.',
        },
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.conversation_member_added',
        entityType: 'chat_conversation',
        entityId: conversationId,
        newValue: {
          addedCount: newUserIds.length,
        },
      });
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversationId,
      'conversation.updated',
    );

    return this.findConversationOrThrow(tenantId, userId, conversationId);
  }

  async removeParticipant(
    tenantId: string,
    userId: string,
    conversationId: string,
    participantUserId: string,
  ) {
    await this.ensureGroupManager(tenantId, userId, conversationId);

    if (participantUserId === userId) {
      throw new BadRequestException('No puedes quitarte desde esta acción.');
    }

    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        tenantId,
        conversationId,
        userId: participantUserId,
      },
      select: { id: true },
    });

    if (!participant) {
      throw new NotFoundException('Participante no encontrado.');
    }

    const participantsCount = await this.prisma.chatParticipant.count({
      where: { tenantId, conversationId },
    });

    if (participantsCount <= 2) {
      throw new BadRequestException(
        'El grupo debe mantener al menos dos participantes.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.chatParticipant.delete({
        where: { id: participant.id },
      });

      await tx.chatMessage.create({
        data: {
          tenantId,
          conversationId,
          type: ChatMessageType.SYSTEM,
          body: 'Se quitó un participante del grupo.',
        },
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.conversation_member_removed',
        entityType: 'chat_conversation',
        entityId: conversationId,
        newValue: {
          removedUserId: participantUserId,
        },
      });
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversationId,
      'conversation.updated',
    );

    return this.findConversationOrThrow(tenantId, userId, conversationId);
  }

  async updateParticipantRole(
    tenantId: string,
    userId: string,
    conversationId: string,
    participantUserId: string,
    dto: UpdateChatParticipantRoleDto,
  ) {
    await this.ensureGroupManager(tenantId, userId, conversationId);

    const participants = await this.prisma.chatParticipant.findMany({
      where: { tenantId, conversationId },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    });
    const participant = participants.find(
      (item) => item.userId === participantUserId,
    );

    if (!participant) {
      throw new NotFoundException('Participante no encontrado.');
    }

    const ownersCount = participants.filter(
      (item) => item.role === ChatParticipantRole.OWNER,
    ).length;

    if (
      participant.role === ChatParticipantRole.OWNER &&
      dto.role === ChatParticipantRole.MEMBER &&
      ownersCount <= 1
    ) {
      throw new BadRequestException(
        'El grupo debe mantener al menos un propietario.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.chatParticipant.update({
        where: { id: participant.id },
        data: { role: dto.role },
      });

      await tx.chatMessage.create({
        data: {
          tenantId,
          conversationId,
          type: ChatMessageType.SYSTEM,
          body: 'Se actualizó el rol de un participante.',
        },
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.conversation_member_role_updated',
        entityType: 'chat_conversation',
        entityId: conversationId,
        newValue: {
          role: dto.role,
        },
      });
    });

    await this.notifyConversationParticipants(
      tenantId,
      conversationId,
      'conversation.updated',
    );

    return this.findConversationOrThrow(tenantId, userId, conversationId);
  }

  async togglePin(tenantId: string, userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, tenantId, deletedAt: null },
      select: { id: true, conversationId: true, pinnedAt: true },
    });

    if (!message) throw new NotFoundException('Mensaje no encontrado.');
    await this.ensureParticipant(tenantId, userId, message.conversationId);

    const isPinned = Boolean(message.pinnedAt);
    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: isPinned
        ? { pinnedAt: null, pinnedById: null }
        : { pinnedAt: new Date(), pinnedById: userId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reactions: { select: { id: true, userId: true, emoji: true, user: { select: { name: true } } } },
        replyTo: {
          select: { id: true, body: true, senderId: true, deletedAt: true, sender: { select: { id: true, name: true } } },
        },
      } as unknown as Prisma.ChatMessageInclude,
    });

    await this.notifyConversationParticipants(
      tenantId,
      message.conversationId,
      'conversation.updated',
    );

    return this.toMessageResponse(updated as any);
  }

  async findPinnedMessages(tenantId: string, userId: string, conversationId: string) {
    await this.ensureParticipant(tenantId, userId, conversationId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { tenantId, conversationId, pinnedAt: { not: null }, deletedAt: null },
      orderBy: { pinnedAt: 'desc' },
      take: 20,
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reactions: { select: { id: true, userId: true, emoji: true, user: { select: { name: true } } } },
        replyTo: {
          select: { id: true, body: true, senderId: true, deletedAt: true, sender: { select: { id: true, name: true } } },
        },
        mentions: { select: { userId: true, user: { select: { name: true } } } },
      } as unknown as Prisma.ChatMessageInclude,
    });

    return messages.map((m) => this.toMessageResponse(m as any));
  }

  async editMessage(
    tenantId: string,
    userId: string,
    messageId: string,
    dto: { body: string },
  ) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, tenantId, senderId: userId, deletedAt: null },
      select: { id: true, conversationId: true, senderId: true },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado o no tienes permiso para editarlo.');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        body: this.chatCrypto.encrypt(dto.body.trim()),
        editedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reactions: { select: { id: true, userId: true, emoji: true, user: { select: { name: true } } } },
        replyTo: {
          select: {
            id: true, body: true, senderId: true, deletedAt: true,
            sender: { select: { id: true, name: true } },
          },
        },
      } as unknown as Prisma.ChatMessageInclude,
    });

    await this.notifyConversationParticipants(
      tenantId,
      message.conversationId,
      'conversation.updated',
    );

    return this.toMessageResponse(updated as any);
  }

  async deleteMessage(
    tenantId: string,
    userId: string,
    permissions: string[],
    messageId: string,
  ) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, tenantId },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado.');
    }

    await this.ensureParticipant(tenantId, userId, message.conversationId);

    if (message.senderId !== userId && !permissions.includes('chat.manage')) {
      throw new ForbiddenException('No puedes eliminar este mensaje.');
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.chatMessage.update({
        where: { id: message.id },
        data: {
          deletedAt: message.deletedAt ?? new Date(),
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'chat.message_deleted',
        entityType: 'chat_message',
        entityId: message.id,
        newValue: {
          conversationId: message.conversationId,
        },
      });

      return updated;
    });

    await this.notifyConversationParticipants(
      tenantId,
      message.conversationId,
      'message.deleted',
    );

    return this.toMessageResponse(deleted);
  }

  private async ensureTenantUser(tenantId: string, userId: string) {
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: {
        tenantId,
        userId,
        status: TenantUserStatus.ACTIVE,
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!tenantUser || tenantUser.role === UserRole.SUPERADMIN) {
      throw new NotFoundException('Usuario no disponible para chat.');
    }

    return tenantUser;
  }

  private async ensureParticipant(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        tenantId,
        userId,
        conversationId,
      },
    });

    if (!participant) {
      const supportParticipant = await this.prisma.chatParticipant.findFirst({
        where: {
          userId,
          conversationId,
          conversation: { type: 'SUPPORT' },
        },
      });

      if (!supportParticipant) {
        throw new ForbiddenException('No participas en esta conversación.');
      }
    }

    return participant;
  }

  private async ensureGroupManager(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        type: ChatConversationType.GROUP,
      },
      select: {
        id: true,
        participants: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Grupo no encontrado.');
    }

    if (conversation.participants.length === 0) {
      throw new ForbiddenException('No participas en este grupo.');
    }

    return conversation;
  }

  private async findExistingDirectConversation(
    tenantId: string,
    userId: string,
    targetUserId: string,
  ) {
    const candidates = await this.prisma.chatConversation.findMany({
      where: {
        tenantId,
        type: ChatConversationType.DIRECT,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    return candidates.find((conversation) => {
      const ids = conversation.participants.map(
        (participant) => participant.userId,
      );
      return (
        ids.length === 2 && ids.includes(userId) && ids.includes(targetUserId)
      );
    });
  }

  private async findConversationOrThrow(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: participantInclude,
          orderBy: { createdAt: 'asc' },
        },
        messages: {
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada.');
    }

    const unreadCounts = await this.countUnreadMessagesByConversation(
      tenantId,
      userId,
      [{
        conversationId: conversation.id,
        lastReadAt:
          conversation.participants.find(
            (participant) => participant.userId === userId,
          )?.lastReadAt ?? null,
      }],
    );

    return this.toConversationResponse(
      conversation,
      unreadCounts.get(conversation.id) ?? 0,
    );
  }

  private async countUnreadMessagesByConversation(
    tenantId: string,
    userId: string,
    conversations: Array<{
      conversationId: string;
      lastReadAt: Date | null;
    }>,
  ) {
    if (!conversations.length) {
      return new Map<string, number>();
    }

    const conversationIds = Array.from(
      new Set(conversations.map((conversation) => conversation.conversationId)),
    );

    const rows = await this.prisma.$queryRaw<
      Array<{ conversationId: string; unreadCount: number }>
    >(Prisma.sql`
      SELECT
        participant."conversationId" AS "conversationId",
        COUNT(message."id")::int AS "unreadCount"
      FROM "chat_participants" participant
      LEFT JOIN "chat_messages" message
        ON message."conversationId" = participant."conversationId"
       AND message."tenantId" = participant."tenantId"
       AND message."deletedAt" IS NULL
       AND (message."senderId" IS NULL OR message."senderId" <> participant."userId")
       AND (
         participant."lastReadAt" IS NULL
         OR message."createdAt" > participant."lastReadAt"
       )
      WHERE participant."tenantId" = ${tenantId}
        AND participant."userId" = ${userId}
        AND participant."conversationId" IN (${Prisma.join(conversationIds)})
      GROUP BY participant."conversationId"
    `);

    return new Map(
      rows.map((row) => [row.conversationId, Number(row.unreadCount) || 0]),
    );
  }

  private async notifyConversationParticipants(
    tenantId: string,
    conversationId: string,
    event: 'message.created' | 'message.deleted' | 'conversation.updated',
  ) {
    const participants = await this.prisma.chatParticipant.findMany({
      where: {
        tenantId,
        conversationId,
      },
      select: {
        userId: true,
      },
    });

    this.chatGateway.notifyConversation({
      tenantId,
      conversationId,
      participantIds: participants.map((participant) => participant.userId),
      event,
    });
  }

  private async applyRetentionPolicy(tenantId: string) {
    const days = Number(
      this.configService.get<string>('CHAT_RETENTION_DAYS') ?? 0,
    );

    if (!Number.isFinite(days) || days <= 0) {
      return;
    }

    const lastRun = this.retentionCache.get(tenantId) ?? 0;
    if (Date.now() - lastRun < ChatService.RETENTION_TTL_MS) {
      return;
    }
    this.retentionCache.set(tenantId, Date.now());

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await this.prisma.chatMessage.updateMany({
      where: {
        tenantId,
        type: ChatMessageType.TEXT,
        deletedAt: null,
        createdAt: {
          lt: cutoff,
        },
      },
      data: {
        deletedAt: new Date(),
        body: 'Mensaje eliminado por política de retención.',
      },
    });
  }

  private toConversationResponse(
    conversation: {
      id: string;
      type: ChatConversationType;
      title: string | null;
      createdById: string | null;
      createdAt: Date;
      updatedAt: Date;
      participants: Array<{
        id: string;
        userId: string;
        role: ChatParticipantRole;
        muted: boolean;
        archived: boolean;
        lastReadAt: Date | null;
        user: {
          id: string;
          name: string;
          email: string;
          avatarUrl: string | null;
        };
      }>;
      messages: Array<{
        id: string;
        conversationId: string;
        senderId: string | null;
        type: ChatMessageType;
        body: string;
        clientEncryptedPayload: Prisma.JsonValue | null;
        deletedAt: Date | null;
        editedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sender: {
          id: string;
          name: string;
          email: string;
          avatarUrl?: string | null;
        } | null;
      }>;
    },
    unreadCount: number,
  ) {
    const lastMessage = conversation.messages[0];

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      createdById: conversation.createdById,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        role: participant.role,
        muted: participant.muted,
        archived: participant.archived,
        lastReadAt: participant.lastReadAt,
        user: participant.user,
      })),
      lastMessage: lastMessage ? this.toMessageResponse(lastMessage) : null,
      unreadCount,
    };
  }

  private toMessageResponse(message: {
    id: string;
    conversationId: string;
    senderId: string | null;
    type: ChatMessageType;
    body: string;
    clientEncryptedPayload: Prisma.JsonValue | null;
    deletedAt: Date | null;
    editedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sender: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
    reactions?: Array<{ id: string; userId: string; emoji: string; user: { name: string } }>;
    replyTo?: {
      id: string;
      body: string;
      senderId: string | null;
      deletedAt: Date | null;
      sender: { id: string; name: string } | null;
    } | null;
    mentions?: Array<{ userId: string; user: { name: string } }>;
  }) {
    const deleted = Boolean(message.deletedAt);

    // Aggregate reactions: { emoji -> { count, userIds, names } }
    const reactionMap = new Map<string, { count: number; userIds: string[]; names: string[] }>();
    for (const r of message.reactions ?? []) {
      const existing = reactionMap.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(r.userId);
        existing.names.push(r.user.name);
      } else {
        reactionMap.set(r.emoji, { count: 1, userIds: [r.userId], names: [r.user.name] });
      }
    }
    const reactions = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userIds: data.userIds,
      names: data.names,
    }));

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      body: deleted
        ? 'Mensaje eliminado'
        : this.chatCrypto.decrypt(message.body),
      clientEncryptedPayload: deleted ? null : message.clientEncryptedPayload,
      deleted,
      deletedAt: message.deletedAt,
      editedAt: message.editedAt,
      pinnedAt: (message as any).pinnedAt ?? null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.sender,
      reactions,
      mentions: (message.mentions ?? []).map((m) => ({
        userId: m.userId,
        name: m.user.name,
      })),
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            body: message.replyTo.deletedAt
              ? 'Mensaje eliminado'
              : this.chatCrypto.decrypt(message.replyTo.body),
            deleted: Boolean(message.replyTo.deletedAt),
            senderId: message.replyTo.senderId,
            senderName: message.replyTo.sender?.name ?? null,
          }
        : null,
    };
  }

  private resolveMentions(
    body: string,
    participants: Array<{ id: string; name: string }>,
  ): string[] {
    // Extract all @word sequences from the message body
    const mentionTokens = Array.from(body.matchAll(/@([\w\sáéíóúàèìòùâêîôûñüÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÑÜ]+)/gu))
      .map((m) => m[1].trim().toLowerCase());

    if (mentionTokens.length === 0) return [];

    const userIds = new Set<string>();
    for (const token of mentionTokens) {
      for (const participant of participants) {
        if (participant.name.toLowerCase().startsWith(token) || participant.name.toLowerCase() === token) {
          userIds.add(participant.id);
        }
      }
    }

    return Array.from(userIds);
  }

  async toggleReaction(
    tenantId: string,
    userId: string,
    messageId: string,
    dto: ToggleReactionDto,
  ) {
    // Verify participant has access to the conversation containing this message
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, tenantId },
      select: { id: true, conversationId: true },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado.');
    }

    await this.ensureParticipant(tenantId, userId, message.conversationId);

    const existing = await this.prisma.chatMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.chatMessageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.chatMessageReaction.create({
        data: { tenantId, messageId, userId, emoji: dto.emoji },
      });
    }

    // Fetch updated reactions for this message
    const updated = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reactions: { select: { id: true, userId: true, emoji: true, user: { select: { name: true } } } },
        replyTo: {
          select: {
            id: true, body: true, senderId: true, deletedAt: true,
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!updated) throw new NotFoundException('Mensaje no encontrado.');

    const response = this.toMessageResponse(updated);

    // Notify all participants via WebSocket
    const participants = await this.prisma.chatParticipant.findMany({
      where: { tenantId, conversationId: message.conversationId, archived: false },
      select: { userId: true },
    });

    this.chatGateway.notifyConversation({
      tenantId,
      conversationId: message.conversationId,
      participantIds: participants.map((p) => p.userId),
      event: 'message.updated',
    });

    return response;
  }
}
