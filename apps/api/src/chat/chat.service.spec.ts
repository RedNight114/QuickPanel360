import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatConversationType,
  ChatMessageType,
  ChatParticipantRole,
  UserRole,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatCryptoService } from './chat-crypto.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: {
    chatConversation: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    chatParticipant: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    chatMessage: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    chatDeviceKey: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      upsert: jest.Mock;
    };
    tenantUser: { findFirst: jest.Mock };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let auditService: { createLog: jest.Mock; createLogWithClient: jest.Mock };
  let chatGateway: { notifyConversation: jest.Mock };
  let chatCrypto: { encrypt: jest.Mock; decrypt: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      chatConversation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      chatParticipant: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      chatDeviceKey: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      tenantUser: { findFirst: jest.fn() },
      $transaction: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    auditService = {
      createLog: jest.fn(),
      createLogWithClient: jest.fn(),
    };
    chatGateway = {
      notifyConversation: jest.fn(),
    };
    chatCrypto = {
      encrypt: jest.fn((value: string) => `enc:${value}`),
      decrypt: jest.fn((value: string) => value.replace(/^enc:/, '')),
    };
    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: ChatGateway, useValue: chatGateway },
        { provide: ChatCryptoService, useValue: chatCrypto },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findConversations', () => {
    it('loads unread counts in a single batched query', async () => {
      const now = new Date();
      prisma.chatConversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          type: ChatConversationType.DIRECT,
          title: null,
          createdById: 'user-1',
          createdAt: now,
          updatedAt: now,
          participants: [
            {
              id: 'p-1',
              userId: 'user-1',
              role: ChatParticipantRole.OWNER,
              muted: false,
              archived: false,
              lastReadAt: now,
              user: {
                id: 'user-1',
                name: 'A',
                email: 'a@test.com',
                avatarUrl: null,
              },
            },
            {
              id: 'p-2',
              userId: 'user-2',
              role: ChatParticipantRole.MEMBER,
              muted: false,
              archived: false,
              lastReadAt: null,
              user: {
                id: 'user-2',
                name: 'B',
                email: 'b@test.com',
                avatarUrl: null,
              },
            },
          ],
          messages: [],
        },
        {
          id: 'conv-2',
          type: ChatConversationType.GROUP,
          title: 'Equipo',
          createdById: 'user-1',
          createdAt: now,
          updatedAt: now,
          participants: [
            {
              id: 'p-3',
              userId: 'user-1',
              role: ChatParticipantRole.OWNER,
              muted: false,
              archived: false,
              lastReadAt: null,
              user: {
                id: 'user-1',
                name: 'A',
                email: 'a@test.com',
                avatarUrl: null,
              },
            },
          ],
          messages: [],
        },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { conversationId: 'conv-1', unreadCount: 2 },
        { conversationId: 'conv-2', unreadCount: 5 },
      ]);

      const result = await service.findConversations('tenant-1', 'user-1');

      expect(prisma.chatConversation.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'conv-1', unreadCount: 2 }),
          expect.objectContaining({ id: 'conv-2', unreadCount: 5 }),
        ]),
      );
    });
  });

  describe('createDirectConversation', () => {
    it('throws BadRequestException when trying to chat with yourself', async () => {
      await expect(
        service.createDirectConversation('tenant-1', 'user-1', {
          userId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user is not an active tenant user', async () => {
      prisma.tenantUser.findFirst
        .mockResolvedValueOnce({
          id: 'tu-1',
          role: UserRole.MANAGER,
          user: { id: 'user-1', name: 'A', email: 'a@test.com' },
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.createDirectConversation('tenant-1', 'user-1', {
          userId: 'user-2',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when target user is a SUPERADMIN', async () => {
      prisma.tenantUser.findFirst
        .mockResolvedValueOnce({
          id: 'tu-1',
          role: UserRole.MANAGER,
          user: { id: 'user-1', name: 'A', email: 'a@test.com' },
        })
        .mockResolvedValueOnce({
          id: 'tu-2',
          role: UserRole.SUPERADMIN,
          user: { id: 'user-2', name: 'B', email: 'b@test.com' },
        });

      await expect(
        service.createDirectConversation('tenant-1', 'user-1', {
          userId: 'user-2',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the existing direct conversation instead of creating a duplicate', async () => {
      prisma.tenantUser.findFirst
        .mockResolvedValueOnce({
          id: 'tu-1',
          role: UserRole.MANAGER,
          user: { id: 'user-1', name: 'A', email: 'a@test.com' },
        })
        .mockResolvedValueOnce({
          id: 'tu-2',
          role: UserRole.MANAGER,
          user: { id: 'user-2', name: 'B', email: 'b@test.com' },
        });

      prisma.chatConversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
        },
      ]);

      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        type: ChatConversationType.DIRECT,
        title: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [
          {
            id: 'p1',
            userId: 'user-1',
            role: ChatParticipantRole.OWNER,
            muted: false,
            archived: false,
            lastReadAt: new Date(),
            user: {
              id: 'user-1',
              name: 'A',
              email: 'a@test.com',
              avatarUrl: null,
            },
          },
          {
            id: 'p2',
            userId: 'user-2',
            role: ChatParticipantRole.MEMBER,
            muted: false,
            archived: false,
            lastReadAt: null,
            user: {
              id: 'user-2',
              name: 'B',
              email: 'b@test.com',
              avatarUrl: null,
            },
          },
        ],
        messages: [],
      });
      prisma.$queryRaw.mockResolvedValue([
        { conversationId: 'conv-1', unreadCount: 0 },
      ]);

      const result = await service.createDirectConversation(
        'tenant-1',
        'user-1',
        { userId: 'user-2' },
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.id).toEqual('conv-1');
    });

    it('creates a new direct conversation, audits it and notifies participants', async () => {
      prisma.tenantUser.findFirst
        .mockResolvedValueOnce({
          id: 'tu-1',
          role: UserRole.MANAGER,
          user: { id: 'user-1', name: 'A', email: 'a@test.com' },
        })
        .mockResolvedValueOnce({
          id: 'tu-2',
          role: UserRole.MANAGER,
          user: { id: 'user-2', name: 'B', email: 'b@test.com' },
        });

      prisma.chatConversation.findMany.mockResolvedValue([]);

      const tx = {
        chatConversation: {
          create: jest.fn().mockResolvedValue({ id: 'conv-new' }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-new',
        type: ChatConversationType.DIRECT,
        title: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [
          {
            id: 'p1',
            userId: 'user-1',
            role: ChatParticipantRole.OWNER,
            muted: false,
            archived: false,
            lastReadAt: new Date(),
            user: {
              id: 'user-1',
              name: 'A',
              email: 'a@test.com',
              avatarUrl: null,
            },
          },
          {
            id: 'p2',
            userId: 'user-2',
            role: ChatParticipantRole.MEMBER,
            muted: false,
            archived: false,
            lastReadAt: null,
            user: {
              id: 'user-2',
              name: 'B',
              email: 'b@test.com',
              avatarUrl: null,
            },
          },
        ],
        messages: [],
      });
      prisma.$queryRaw.mockResolvedValue([
        { conversationId: 'conv-new', unreadCount: 0 },
      ]);
      prisma.chatParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      const result = await service.createDirectConversation(
        'tenant-1',
        'user-1',
        { userId: 'user-2' },
      );

      expect(tx.chatConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            type: ChatConversationType.DIRECT,
            createdById: 'user-1',
          }),
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'chat.conversation_created',
          entityType: 'chat_conversation',
          entityId: 'conv-new',
        }),
      );
      expect(chatGateway.notifyConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          conversationId: 'conv-new',
          event: 'conversation.updated',
        }),
      );
      expect(result.id).toEqual('conv-new');
    });
  });

  describe('createGroupConversation', () => {
    it('throws BadRequestException when title is empty after trimming', async () => {
      await expect(
        service.createGroupConversation('tenant-1', 'user-1', {
          title: '   ',
          participantIds: ['user-2'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when fewer than two unique participants are selected', async () => {
      await expect(
        service.createGroupConversation('tenant-1', 'user-1', {
          title: 'Equipo',
          participantIds: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the only other participant equals the creator (deduped)', async () => {
      await expect(
        service.createGroupConversation('tenant-1', 'user-1', {
          title: 'Equipo',
          participantIds: ['user-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a group conversation with creator as OWNER and others as MEMBER', async () => {
      prisma.tenantUser.findFirst.mockResolvedValue({
        id: 'tu-x',
        role: UserRole.MANAGER,
        user: { id: 'user-x', name: 'X', email: 'x@test.com' },
      });

      const tx = {
        chatConversation: {
          create: jest.fn().mockResolvedValue({ id: 'conv-group' }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-group',
        type: ChatConversationType.GROUP,
        title: 'Equipo',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        messages: [],
      });
      prisma.chatParticipant.findMany.mockResolvedValue([]);

      await service.createGroupConversation('tenant-1', 'user-1', {
        title: '  Equipo  ',
        participantIds: ['user-2', 'user-3'],
      });

      expect(tx.chatConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: ChatConversationType.GROUP,
            title: 'Equipo',
            participants: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  userId: 'user-1',
                  role: ChatParticipantRole.OWNER,
                }),
                expect.objectContaining({
                  userId: 'user-2',
                  role: ChatParticipantRole.MEMBER,
                }),
                expect.objectContaining({
                  userId: 'user-3',
                  role: ChatParticipantRole.MEMBER,
                }),
              ]),
            },
          }),
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'chat.group_created',
          newValue: expect.objectContaining({ participantCount: 3 }),
        }),
      );
    });
  });

  describe('sendMessage', () => {
    it('throws ForbiddenException when the user is not a participant', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('tenant-1', 'user-1', 'conv-1', {
          body: 'Hola',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the message body is empty after trimming', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });

      await expect(
        service.sendMessage('tenant-1', 'user-1', 'conv-1', {
          body: '    ',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('encrypts the message body before persisting and decrypts it in the response', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });

      const tx = {
        chatMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            type: ChatMessageType.TEXT,
            body: 'enc:Hola equipo',
            clientEncryptedPayload: null,
            deletedAt: null,
            editedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            sender: {
              id: 'user-1',
              name: 'A',
              email: 'a@test.com',
              avatarUrl: null,
            },
          }),
        },
        chatConversation: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );
      prisma.chatParticipant.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      const result = await service.sendMessage('tenant-1', 'user-1', 'conv-1', {
        body: 'Hola equipo',
      });

      expect(chatCrypto.encrypt).toHaveBeenCalledWith('Hola equipo');
      expect(tx.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            body: 'enc:Hola equipo',
          }),
        }),
      );
      expect(chatCrypto.decrypt).toHaveBeenCalledWith('enc:Hola equipo');
      expect(result.body).toEqual('Hola equipo');
      expect(chatGateway.notifyConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          event: 'message.created',
        }),
      );
    });

    it('forwards the clientEncryptedPayload when provided (E2E client-side payload)', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });

      const tx = {
        chatMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'msg-2',
            conversationId: 'conv-1',
            senderId: 'user-1',
            type: ChatMessageType.TEXT,
            body: 'enc:Hola',
            clientEncryptedPayload: { ciphertext: 'abc' },
            deletedAt: null,
            editedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            sender: null,
          }),
        },
        chatConversation: { update: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );
      prisma.chatParticipant.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      await service.sendMessage('tenant-1', 'user-1', 'conv-1', {
        body: 'Hola',
        clientEncryptedPayload: { ciphertext: 'abc' },
      });

      expect(tx.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientEncryptedPayload: { ciphertext: 'abc' },
          }),
        }),
      );
    });
  });

  describe('deleteMessage', () => {
    it('throws NotFoundException when the message does not exist for the tenant', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMessage('tenant-1', 'user-1', [], 'msg-missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the user is not a participant of the conversation', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        deletedAt: null,
      });
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMessage('tenant-1', 'user-1', [], 'msg-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when a non-sender without chat.manage tries to delete', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        deletedAt: null,
      });
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });

      await expect(
        service.deleteMessage('tenant-1', 'user-1', [], 'msg-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the sender to delete their own message', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        deletedAt: null,
      });
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });

      const tx = {
        chatMessage: {
          update: jest.fn().mockResolvedValue({
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            type: ChatMessageType.TEXT,
            body: 'enc:Hola',
            clientEncryptedPayload: null,
            deletedAt: new Date(),
            editedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            sender: {
              id: 'user-1',
              name: 'A',
              email: 'a@test.com',
              avatarUrl: null,
            },
          }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );
      prisma.chatParticipant.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      const result = await service.deleteMessage(
        'tenant-1',
        'user-1',
        [],
        'msg-1',
      );

      expect(result.deleted).toBe(true);
      expect(result.body).toEqual('Mensaje eliminado');
      expect(chatGateway.notifyConversation).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'message.deleted' }),
      );
    });

    it('allows a user with chat.manage permission to delete others messages', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        deletedAt: null,
      });
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });

      const tx = {
        chatMessage: {
          update: jest.fn().mockResolvedValue({
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-2',
            type: ChatMessageType.TEXT,
            body: 'enc:Hola',
            clientEncryptedPayload: null,
            deletedAt: new Date(),
            editedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            sender: null,
          }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );
      prisma.chatParticipant.findMany.mockResolvedValue([]);

      const result = await service.deleteMessage(
        'tenant-1',
        'user-1',
        ['chat.manage'],
        'msg-1',
      );

      expect(result.deleted).toBe(true);
    });
  });

  describe('leaveGroup', () => {
    it('throws NotFoundException when the group does not exist for the tenant', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue(null);

      await expect(
        service.leaveGroup('tenant-1', 'user-1', 'conv-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the user does not belong to the group', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [{ id: 'p2', userId: 'user-2' }],
      });

      await expect(
        service.leaveGroup('tenant-1', 'user-1', 'conv-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when leaving would drop below 2 participants', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [
          { id: 'p1', userId: 'user-1' },
          { id: 'p2', userId: 'user-2' },
        ],
      });

      await expect(
        service.leaveGroup('tenant-1', 'user-1', 'conv-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('removes the participant and logs an audit entry when allowed', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [
          { id: 'p1', userId: 'user-1' },
          { id: 'p2', userId: 'user-2' },
          { id: 'p3', userId: 'user-3' },
        ],
      });

      const tx = {
        chatParticipant: { delete: jest.fn().mockResolvedValue({}) },
        chatMessage: { create: jest.fn().mockResolvedValue({}) },
        chatConversation: { update: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );
      prisma.chatParticipant.findMany.mockResolvedValue([
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);

      const result = await service.leaveGroup('tenant-1', 'user-1', 'conv-1');

      expect(tx.chatParticipant.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'chat.conversation_member_left',
        }),
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('updateParticipantRole', () => {
    it('throws BadRequestException when demoting the last remaining owner', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [{ id: 'p1' }],
      });
      prisma.chatParticipant.findMany.mockResolvedValue([
        { id: 'p1', userId: 'user-1', role: ChatParticipantRole.OWNER },
        { id: 'p2', userId: 'user-2', role: ChatParticipantRole.MEMBER },
      ]);

      await expect(
        service.updateParticipantRole(
          'tenant-1',
          'user-1',
          'conv-1',
          'user-1',
          { role: ChatParticipantRole.MEMBER },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the target participant does not exist', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [{ id: 'p1' }],
      });
      prisma.chatParticipant.findMany.mockResolvedValue([
        { id: 'p1', userId: 'user-1', role: ChatParticipantRole.OWNER },
      ]);

      await expect(
        service.updateParticipantRole(
          'tenant-1',
          'user-1',
          'conv-1',
          'user-missing',
          { role: ChatParticipantRole.MEMBER },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows promoting a member to owner when there are multiple owners possible', async () => {
      // 1st call: ensureGroupManager -> chatConversation.findFirst
      prisma.chatConversation.findFirst.mockResolvedValueOnce({
        id: 'conv-1',
        participants: [{ id: 'p1' }],
      });
      // chatParticipant.findMany -> list used to find target + count owners
      prisma.chatParticipant.findMany.mockResolvedValueOnce([
        { id: 'p1', userId: 'user-1', role: ChatParticipantRole.OWNER },
        { id: 'p2', userId: 'user-2', role: ChatParticipantRole.MEMBER },
      ]);
      // 2nd call: notifyConversationParticipants -> chatParticipant.findMany
      prisma.chatParticipant.findMany.mockResolvedValueOnce([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      const tx = {
        chatParticipant: { update: jest.fn().mockResolvedValue({}) },
        chatMessage: { create: jest.fn().mockResolvedValue({}) },
        chatConversation: { update: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      // 3rd call: findConversationOrThrow -> chatConversation.findFirst
      prisma.chatConversation.findFirst.mockResolvedValueOnce({
        id: 'conv-1',
        type: ChatConversationType.GROUP,
        title: 'Equipo',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        messages: [],
      });
      prisma.$queryRaw.mockResolvedValue([
        { conversationId: 'conv-1', unreadCount: 0 },
      ]);

      await service.updateParticipantRole(
        'tenant-1',
        'user-1',
        'conv-1',
        'user-2',
        { role: ChatParticipantRole.OWNER },
      );

      expect(tx.chatParticipant.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { role: ChatParticipantRole.OWNER },
      });
    });
  });

  describe('removeParticipant', () => {
    it('throws BadRequestException when trying to remove yourself via this action', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [{ id: 'p1' }],
      });

      await expect(
        service.removeParticipant('tenant-1', 'user-1', 'conv-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the participant to remove does not exist', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [{ id: 'p1' }],
      });
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.removeParticipant('tenant-1', 'user-1', 'conv-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when removal would drop below 2 participants', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [{ id: 'p1' }],
      });
      prisma.chatParticipant.findFirst.mockResolvedValue({ id: 'p2' });
      prisma.chatParticipant.count.mockResolvedValue(2);

      await expect(
        service.removeParticipant('tenant-1', 'user-1', 'conv-1', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ensureGroupManager (via addParticipants)', () => {
    it('throws NotFoundException when the conversation is not a group owned by the tenant', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue(null);

      await expect(
        service.addParticipants('tenant-1', 'user-1', 'conv-1', {
          userIds: ['user-2'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is not a participant of the group', async () => {
      prisma.chatConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        participants: [],
      });

      await expect(
        service.addParticipants('tenant-1', 'user-1', 'conv-1', {
          userIds: ['user-2'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('registerDeviceKey / revokeDeviceKey', () => {
    it('upserts the device key with default algorithm when not provided', async () => {
      prisma.chatDeviceKey.upsert.mockResolvedValue({
        id: 'key-1',
        deviceId: 'device-1',
      });

      await service.registerDeviceKey('tenant-1', 'user-1', {
        deviceId: 'device-12345678',
        publicKey: 'a'.repeat(64),
      });

      expect(prisma.chatDeviceKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            algorithm: 'ECDH-P256',
            active: true,
          }),
          update: expect.objectContaining({
            algorithm: 'ECDH-P256',
            active: true,
          }),
        }),
      );
    });

    it('throws NotFoundException when revoking a key that does not exist or is inactive', async () => {
      prisma.chatDeviceKey.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeDeviceKey('tenant-1', 'user-1', 'device-missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deactivates an existing device key and writes an audit log', async () => {
      prisma.chatDeviceKey.findFirst.mockResolvedValue({
        id: 'key-1',
        deviceId: 'device-1',
        algorithm: 'ECDH-P256',
      });

      const tx = {
        chatDeviceKey: { update: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.revokeDeviceKey(
        'tenant-1',
        'user-1',
        'device-1',
      );

      expect(tx.chatDeviceKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: expect.objectContaining({ active: false }),
      });
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'chat.device_key_revoked',
          entityType: 'chat_device_key',
          entityId: 'key-1',
        }),
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('markRead / archiveConversation / muteConversation', () => {
    it('throws ForbiddenException for markRead when the user is not a participant', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.markRead('tenant-1', 'user-1', 'conv-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates lastReadAt for a valid participant', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
      });
      prisma.chatParticipant.update.mockResolvedValue({});

      const result = await service.markRead('tenant-1', 'user-1', 'conv-1');

      expect(prisma.chatParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            conversationId_userId: {
              conversationId: 'conv-1',
              userId: 'user-1',
            },
          },
          data: expect.objectContaining({ lastReadAt: expect.any(Date) }),
        }),
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
