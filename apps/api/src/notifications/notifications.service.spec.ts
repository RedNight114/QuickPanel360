import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    internalNotification: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      internalNotification: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: { set: jest.fn(), get: jest.fn() } },
      ],
    }).compile();

    service = module.get(NotificationsService);
    jest
      .spyOn(service as never, 'syncTenantNotifications' as never)
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks a notification as in review and sets readAt when missing', async () => {
    prisma.internalNotification.findFirst.mockResolvedValue({
      id: 'notification-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.INFO,
      status: NotificationStatus.UNREAD,
      title: 'Aviso',
      message: 'Mensaje',
      readAt: null,
    });
    prisma.internalNotification.update.mockResolvedValue({
      id: 'notification-1',
      status: NotificationStatus.IN_REVIEW,
    });

    await service.markInReview(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        tenantUserId: 'tu-1',
        role: UserRole.EMPLOYEE,
        permissions: ['notifications.resolve'],
        email: 'user@example.com',
        name: 'User',
      },
      'notification-1',
    );

    expect(prisma.internalNotification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: {
        status: NotificationStatus.IN_REVIEW,
        readAt: expect.any(Date),
      },
    });
  });

  it('uses scoped visibility for collaborators in unread count', async () => {
    prisma.internalNotification.count.mockResolvedValue(3);

    const result = await service.getUnreadCount({
      tenantId: 'tenant-1',
      userId: 'user-7',
      tenantUserId: 'tu-7',
      role: UserRole.EMPLOYEE,
      permissions: ['notifications.view'],
      email: 'colab@example.com',
      name: 'Colaborador',
    });

    expect(result).toEqual({ count: 3 });
    expect(prisma.internalNotification.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        OR: [{ userId: null }, { userId: 'user-7' }],
        status: NotificationStatus.UNREAD,
      },
    });
  });

  it('allows tenant-wide unread count for owner users', async () => {
    prisma.internalNotification.count.mockResolvedValue(8);

    await service.getUnreadCount({
      tenantId: 'tenant-1',
      userId: 'owner-1',
      tenantUserId: 'tu-owner-1',
      role: UserRole.OWNER,
      permissions: ['notifications.view'],
      email: 'owner@example.com',
      name: 'Owner',
    });

    expect(prisma.internalNotification.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        status: NotificationStatus.UNREAD,
      },
    });
  });
});
