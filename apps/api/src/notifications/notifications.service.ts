import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import {
  AccessLinkStatus,
  EmergencyLockStatus,
  MemberStatus,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  PosSessionStatus,
  Prisma,
  ProductStatus,
  ReceivableStatus,
  SaleStatus,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';

const OPEN_NOTIFICATION_STATUSES = [
  NotificationStatus.UNREAD,
  NotificationStatus.READ,
  NotificationStatus.IN_REVIEW,
] as const;

const DYNAMIC_NOTIFICATION_TYPES = [
  NotificationType.INVENTORY_LOW,
  NotificationType.INVENTORY_OUT,
  NotificationType.MEMBER_BIRTHDAY,
  NotificationType.MEMBER_PENDING_CONTRIBUTION,
  NotificationType.SECURITY_ALERT,
  NotificationType.EMERGENCY_ACTIVE,
  NotificationType.CASH_OPEN_TOO_LONG,
] as const;

type NotificationCondition = {
  key: string;
  userId?: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  private readonly syncCache = new Map<string, number>();
  private static readonly SYNC_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findAll(user: AuthUser, query: NotificationsQueryDto) {
    await this.syncTenantNotifications(user.tenantId);

    return this.prisma.internalNotification.findMany({
      where: this.buildListWhere(user, query),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: query.take ?? 50,
    });
  }

  async getUnreadCount(user: AuthUser) {
    await this.syncTenantNotifications(user.tenantId);

    const count = await this.prisma.internalNotification.count({
      where: {
        ...this.buildVisibilityWhere(user),
        status: NotificationStatus.UNREAD,
      },
    });

    return { count };
  }

  async markRead(user: AuthUser, id: string) {
    const notification = await this.findScopedNotification(user, id);
    const nextStatus =
      notification.status === NotificationStatus.UNREAD
        ? NotificationStatus.READ
        : notification.status;

    return this.prisma.internalNotification.update({
      where: { id: notification.id },
      data: {
        status: nextStatus,
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  async markAllRead(user: AuthUser) {
    const now = new Date();
    const result = await this.prisma.internalNotification.updateMany({
      where: {
        ...this.buildVisibilityWhere(user),
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    return { updated: result.count };
  }

  async markInReview(user: AuthUser, id: string) {
    const notification = await this.findScopedNotification(user, id);
    const now = new Date();

    return this.prisma.internalNotification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.IN_REVIEW,
        readAt: notification.readAt ?? now,
      },
    });
  }

  async resolve(user: AuthUser, id: string) {
    const notification = await this.findScopedNotification(user, id);
    const now = new Date();

    return this.prisma.internalNotification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.RESOLVED,
        readAt: notification.readAt ?? now,
        resolvedAt: now,
      },
    });
  }

  async archive(user: AuthUser, id: string) {
    const notification = await this.findScopedNotification(user, id);
    const now = new Date();

    return this.prisma.internalNotification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.ARCHIVED,
        readAt: notification.readAt ?? now,
        archivedAt: now,
      },
    });
  }

  private buildListWhere(user: AuthUser, query: NotificationsQueryDto) {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (dateFrom) {
      dateFrom.setHours(0, 0, 0, 0);
    }

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    return {
      ...this.buildVisibilityWhere(user),
      type: query.type,
      priority: query.priority,
      status:
        query.status ??
        ({
          not: NotificationStatus.ARCHIVED,
        } satisfies Prisma.EnumNotificationStatusFilter),
      createdAt:
        dateFrom || dateTo
          ? ({
              gte: dateFrom,
              lte: dateTo,
            } satisfies Prisma.DateTimeFilter)
          : undefined,
      OR: query.q?.trim()
        ? [
            {
              title: {
                contains: query.q.trim(),
                mode: 'insensitive' as const,
              },
            },
            {
              message: {
                contains: query.q.trim(),
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    } satisfies Prisma.InternalNotificationWhereInput;
  }

  private buildVisibilityWhere(user: AuthUser) {
    const canViewTenantWide =
      user.role === UserRole.OWNER ||
      user.role === UserRole.MANAGER ||
      user.permissions.includes('notifications.manage') ||
      user.permissions.includes('notifications.resolve');

    return {
      tenantId: user.tenantId,
      ...(canViewTenantWide
        ? {}
        : {
            OR: [{ userId: null }, { userId: user.userId }],
          }),
    } satisfies Prisma.InternalNotificationWhereInput;
  }

  private async findScopedNotification(user: AuthUser, id: string) {
    const notification = await this.prisma.internalNotification.findFirst({
      where: {
        id,
        ...this.buildVisibilityWhere(user),
      },
    });

    if (!notification) {
      throw new NotFoundException('Aviso no encontrado');
    }

    return notification;
  }

  private async syncTenantNotifications(tenantId: string) {
    const lastSync = this.syncCache.get(tenantId) ?? 0;
    if (Date.now() - lastSync < NotificationsService.SYNC_TTL_MS) {
      return;
    }

    const lockKey = `notifications:sync:${tenantId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 30, 'NX');
    if (!acquired) return;

    this.syncCache.set(tenantId, Date.now());

    const now = new Date();
    const recentCutoff = new Date(now);
    recentCutoff.setDate(recentCutoff.getDate() - 30);

    const [
      openNotifications,
      tenantSettings,
      inventoryRows,
      toleranceItems,
      positiveWasteItems,
      negativeDifferenceItems,
      cashDifferenceSessions,
      openTooLongSessions,
      activeReceivables,
      birthdayMembers,
      activeEmergencyLock,
      activeAccessLinkCount,
    ] = await Promise.all([
      this.prisma.internalNotification.findMany({
        where: {
          tenantId,
          status: { in: [...OPEN_NOTIFICATION_STATUSES] },
        },
        select: {
          id: true,
          type: true,
          userId: true,
          entityType: true,
          entityId: true,
        },
      }),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: {
          maxWastePerLineGrams: true,
          requireAccessLink: true,
          showSecurityBadges: true,
        },
      }),
      this.prisma.inventory.findMany({
        where: {
          tenantId,
          product: {
            status: { not: ProductStatus.ARCHIVED },
            trackStock: true,
          },
        },
        select: {
          productId: true,
          currentQuantity: true,
          minimumQuantity: true,
          product: {
            select: {
              id: true,
              name: true,
              unitType: true,
            },
          },
        },
      }),
      this.prisma.saleItem.findMany({
        where: {
          tenantId,
          scaleToleranceExceeded: true,
          sale: {
            status: SaleStatus.COMPLETED,
          },
          createdAt: {
            gte: recentCutoff,
          },
        },
        select: {
          id: true,
          productNameSnapshot: true,
          weightDifference: true,
          wasteQuantity: true,
          sale: {
            select: {
              id: true,
              soldById: true,
              soldBy: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.saleItem.findMany({
        where: {
          tenantId,
          wasteQuantity: { gt: 0 },
          sale: {
            status: SaleStatus.COMPLETED,
          },
          createdAt: {
            gte: recentCutoff,
          },
        },
        select: {
          id: true,
          productNameSnapshot: true,
          wasteQuantity: true,
          sale: {
            select: {
              id: true,
              soldById: true,
              soldBy: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.saleItem.findMany({
        where: {
          tenantId,
          weightDifference: { lt: 0 },
          sale: {
            status: SaleStatus.COMPLETED,
          },
          createdAt: {
            gte: recentCutoff,
          },
        },
        select: {
          id: true,
          productNameSnapshot: true,
          weightDifference: true,
          sale: {
            select: {
              id: true,
              soldById: true,
              soldBy: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.posSession.findMany({
        where: {
          tenantId,
          status: PosSessionStatus.CLOSED,
          closedAt: { gte: recentCutoff },
          difference: { not: 0 },
        },
        select: {
          id: true,
          openedById: true,
          closedById: true,
          difference: true,
          openedBy: {
            select: {
              name: true,
            },
          },
          closedAt: true,
        },
      }),
      this.prisma.posSession.findMany({
        where: {
          tenantId,
          status: PosSessionStatus.OPEN,
          openedAt: {
            lte: new Date(now.getTime() - 12 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          openedById: true,
          openedAt: true,
          openedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.receivable.findMany({
        where: {
          tenantId,
          status: {
            in: [
              ReceivableStatus.OPEN,
              ReceivableStatus.PARTIALLY_PAID,
              ReceivableStatus.OVERDUE,
            ],
          },
          outstandingAmount: { gt: 0 },
        },
        select: {
          id: true,
          outstandingAmount: true,
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.member.findMany({
        where: {
          tenantId,
          status: { not: MemberStatus.DELETED },
          birthDate: { not: null },
        },
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          displayName: true,
          birthDate: true,
        },
      }),
      this.prisma.emergencyLock.findFirst({
        where: {
          tenantId,
          status: EmergencyLockStatus.ACTIVE,
        },
        orderBy: {
          activatedAt: 'desc',
        },
        select: {
          id: true,
          reason: true,
        },
      }),
      this.prisma.accessLink.count({
        where: {
          tenantId,
          status: AccessLinkStatus.ACTIVE,
        },
      }),
    ]);

    const openMap = new Map(
      openNotifications.map((item) => [
        this.notificationKey(item.type, item.entityType, item.entityId, item.userId),
        item.id,
      ]),
    );
    const activeDynamicKeys = new Set<string>();
    const positiveWasteAlertThresholdGrams = Math.max(
      this.toNumber(tenantSettings?.maxWastePerLineGrams) * 2,
      0.1,
    );

    for (const row of inventoryRows) {
      const currentQuantity = this.toNumber(row.currentQuantity);
      const minimumQuantity = this.toNumber(row.minimumQuantity);
      const productName = row.product.name;
      const unit = row.product.unitType === 'GRAM' ? 'g' : row.product.unitType;

      if (currentQuantity <= 0) {
        const condition = this.makeCondition({
          type: NotificationType.INVENTORY_OUT,
          priority: NotificationPriority.CRITICAL,
          entityType: 'inventory',
          entityId: row.productId,
          title: 'Sin disponibilidad',
          message: `${productName} ya no tiene inventario disponible.`,
          metadata: { path: '/inventory', productId: row.productId },
        });
        activeDynamicKeys.add(condition.key);
        await this.ensureOpenNotification(tenantId, openMap, condition);
      } else if (minimumQuantity > 0 && currentQuantity <= minimumQuantity) {
        const condition = this.makeCondition({
          type: NotificationType.INVENTORY_LOW,
          priority: NotificationPriority.WARNING,
          entityType: 'inventory',
          entityId: row.productId,
          title: 'Inventario bajo',
          message: `${productName} está en inventario bajo (${this.formatQuantity(currentQuantity)} ${unit}).`,
          metadata: { path: '/inventory', productId: row.productId },
        });
        activeDynamicKeys.add(condition.key);
        await this.ensureOpenNotification(tenantId, openMap, condition);
      }
    }

    for (const item of openTooLongSessions) {
      const condition = this.makeCondition({
        type: NotificationType.CASH_OPEN_TOO_LONG,
        priority: NotificationPriority.WARNING,
        userId: item.openedById,
        entityType: 'pos_session',
        entityId: item.id,
        title: 'Caja abierta durante demasiado tiempo',
        message: `${item.openedBy.name || 'Colaborador'} mantiene una caja abierta desde ${item.openedAt.toLocaleString('es-ES')}.`,
        metadata: { path: '/cash', posSessionId: item.id },
      });
      activeDynamicKeys.add(condition.key);
      await this.ensureOpenNotification(tenantId, openMap, condition);
    }

    for (const receivable of activeReceivables) {
      const memberName = this.memberName(receivable.member);
      const condition = this.makeCondition({
        type: NotificationType.MEMBER_PENDING_CONTRIBUTION,
        priority: NotificationPriority.IMPORTANT,
        entityType: 'receivable',
        entityId: receivable.id,
        title: 'Pendiente de aportación de socio',
        message: `${memberName} mantiene ${this.formatCredits(receivable.outstandingAmount)} pendientes de aportación.`,
        metadata: {
          path: '/receivables',
          receivableId: receivable.id,
          memberId: receivable.member.id,
        },
      });
      activeDynamicKeys.add(condition.key);
      await this.ensureOpenNotification(tenantId, openMap, condition);
    }

    for (const member of birthdayMembers) {
      const daysUntilBirthday = this.daysUntilBirthday(member.birthDate);
      if (daysUntilBirthday > 7) {
        continue;
      }

      const memberName = this.memberName(member);
      const title =
        daysUntilBirthday === 0
          ? 'Cumpleaños de socio hoy'
          : 'Cumpleaños de socio próximo';
      const message =
        daysUntilBirthday === 0
          ? `${memberName} cumple hoy.`
          : `${memberName} cumple en ${daysUntilBirthday} día(s).`;
      const condition = this.makeCondition({
        type: NotificationType.MEMBER_BIRTHDAY,
        priority: NotificationPriority.INFO,
        entityType: 'member',
        entityId: member.id,
        title,
        message,
        metadata: { path: '/members', memberId: member.id },
      });
      activeDynamicKeys.add(condition.key);
      await this.ensureOpenNotification(tenantId, openMap, condition);
    }

    if (activeEmergencyLock) {
      const condition = this.makeCondition({
        type: NotificationType.EMERGENCY_ACTIVE,
        priority: NotificationPriority.CRITICAL,
        entityType: 'emergency_lock',
        entityId: activeEmergencyLock.id,
        title: 'Modo emergencia activo',
        message: activeEmergencyLock.reason
          ? `El modo emergencia está activo: ${activeEmergencyLock.reason}.`
          : 'El modo emergencia está activo en el club.',
        metadata: { path: '/security', emergencyLockId: activeEmergencyLock.id },
      });
      activeDynamicKeys.add(condition.key);
      await this.ensureOpenNotification(tenantId, openMap, condition);
    }

    if (
      tenantSettings?.showSecurityBadges &&
      tenantSettings.requireAccessLink &&
      activeAccessLinkCount === 0 &&
      !activeEmergencyLock
    ) {
      const condition = this.makeCondition({
        type: NotificationType.SECURITY_ALERT,
        priority: NotificationPriority.IMPORTANT,
        entityType: 'security',
        entityId: 'access-link-missing',
        title: 'Acceso público sin enlace activo',
        message:
          'No hay un enlace de acceso activo para el club. Revisa la sección de seguridad.',
        metadata: { path: '/security' },
      });
      activeDynamicKeys.add(condition.key);
      await this.ensureOpenNotification(tenantId, openMap, condition);
    }

    await this.resolveInactiveDynamicNotifications(
      tenantId,
      openNotifications,
      activeDynamicKeys,
    );

    const existingEventKeys = new Set(
      (
        await this.prisma.internalNotification.findMany({
          where: {
            tenantId,
            type: {
              in: [
                NotificationType.SCALE_TOLERANCE_EXCEEDED,
                NotificationType.POSITIVE_WASTE_HIGH,
                NotificationType.NEGATIVE_DIFFERENCE,
                NotificationType.CASH_DIFFERENCE,
              ],
            },
          },
          select: {
            type: true,
            userId: true,
            entityType: true,
            entityId: true,
          },
        })
      ).map((item) =>
        this.notificationKey(item.type, item.entityType, item.entityId, item.userId),
      ),
    );

    for (const item of toleranceItems) {
      const key = this.notificationKey(
        NotificationType.SCALE_TOLERANCE_EXCEEDED,
        'sale_item',
        item.id,
        item.sale.soldById,
      );
      if (existingEventKeys.has(key)) {
        continue;
      }

      await this.prisma.internalNotification.create({
        data: {
          tenantId,
          userId: item.sale.soldById,
          type: NotificationType.SCALE_TOLERANCE_EXCEEDED,
          priority: NotificationPriority.IMPORTANT,
          status: NotificationStatus.UNREAD,
          title: 'Tolerancia de báscula superada',
          message: `${item.productNameSnapshot} superó la tolerancia permitida en una dispensación registrada por ${item.sale.soldBy.name || 'colaborador'}.`,
          entityType: 'sale_item',
          entityId: item.id,
          metadata: {
            path: '/pos',
            saleId: item.sale.id,
            saleItemId: item.id,
          },
        },
      });
      existingEventKeys.add(key);
    }

    for (const item of positiveWasteItems) {
      const wasteGrams = this.kgToGrams(item.wasteQuantity);
      if (wasteGrams < positiveWasteAlertThresholdGrams) {
        continue;
      }

      const key = this.notificationKey(
        NotificationType.POSITIVE_WASTE_HIGH,
        'sale_item',
        item.id,
        item.sale.soldById,
      );
      if (existingEventKeys.has(key)) {
        continue;
      }

      await this.prisma.internalNotification.create({
        data: {
          tenantId,
          userId: item.sale.soldById,
          type: NotificationType.POSITIVE_WASTE_HIGH,
          priority: NotificationPriority.WARNING,
          status: NotificationStatus.UNREAD,
          title: 'Merma positiva elevada',
          message: `${item.productNameSnapshot} registró una merma por báscula de ${this.formatGrams(wasteGrams)} en una dispensación de ${item.sale.soldBy.name || 'colaborador'}.`,
          entityType: 'sale_item',
          entityId: item.id,
          metadata: {
            path: '/pos',
            saleId: item.sale.id,
            saleItemId: item.id,
          },
        },
      });
      existingEventKeys.add(key);
    }

    for (const item of negativeDifferenceItems) {
      const key = this.notificationKey(
        NotificationType.NEGATIVE_DIFFERENCE,
        'sale_item',
        item.id,
        item.sale.soldById,
      );
      if (existingEventKeys.has(key)) {
        continue;
      }

      await this.prisma.internalNotification.create({
        data: {
          tenantId,
          userId: item.sale.soldById,
          type: NotificationType.NEGATIVE_DIFFERENCE,
          priority: NotificationPriority.WARNING,
          status: NotificationStatus.UNREAD,
          title: 'Diferencia negativa registrada',
          message: `${item.productNameSnapshot} registró una diferencia negativa de ${this.formatGrams(Math.abs(this.toNumber(item.weightDifference)) * 1000)} en una dispensación.`,
          entityType: 'sale_item',
          entityId: item.id,
          metadata: {
            path: '/pos',
            saleId: item.sale.id,
            saleItemId: item.id,
          },
        },
      });
      existingEventKeys.add(key);
    }

    for (const session of cashDifferenceSessions) {
      const recipientUserId = session.closedById ?? session.openedById;
      const key = this.notificationKey(
        NotificationType.CASH_DIFFERENCE,
        'pos_session',
        session.id,
        recipientUserId,
      );
      if (existingEventKeys.has(key)) {
        continue;
      }

      await this.prisma.internalNotification.create({
        data: {
          tenantId,
          userId: recipientUserId,
          type: NotificationType.CASH_DIFFERENCE,
          priority:
            Math.abs(this.toNumber(session.difference)) >= 20
              ? NotificationPriority.CRITICAL
              : NotificationPriority.IMPORTANT,
          status: NotificationStatus.UNREAD,
          title: 'Diferencia de caja detectada',
          message: `${session.openedBy.name || 'Colaborador'} cerró caja con una diferencia de ${this.formatCredits(session.difference)}.`,
          entityType: 'pos_session',
          entityId: session.id,
          metadata: {
            path: '/cash',
            posSessionId: session.id,
            closedAt: session.closedAt?.toISOString() ?? null,
          },
        },
      });
      existingEventKeys.add(key);
    }
  }

  private async resolveInactiveDynamicNotifications(
    tenantId: string,
    openNotifications: Array<{
      id: string;
      type: NotificationType;
      userId: string | null;
      entityType: string | null;
      entityId: string | null;
    }>,
    activeKeys: Set<string>,
  ) {
    const staleIds = openNotifications
      .filter(
        (item) =>
          DYNAMIC_NOTIFICATION_TYPES.includes(
            item.type as (typeof DYNAMIC_NOTIFICATION_TYPES)[number],
          ) &&
          !activeKeys.has(
            this.notificationKey(item.type, item.entityType, item.entityId, item.userId),
          ),
      )
      .map((item) => item.id);

    if (!staleIds.length) {
      return;
    }

    const now = new Date();
    await this.prisma.internalNotification.updateMany({
      where: {
        tenantId,
        id: { in: staleIds },
      },
      data: {
        status: NotificationStatus.RESOLVED,
        resolvedAt: now,
      },
    });
  }

  private async ensureOpenNotification(
    tenantId: string,
    openMap: Map<string, string>,
    condition: NotificationCondition,
  ) {
    if (openMap.has(condition.key)) {
      return;
    }

    const created = await this.prisma.internalNotification.create({
      data: {
        tenantId,
        userId: condition.userId,
        type: condition.type,
        priority: condition.priority,
        status: NotificationStatus.UNREAD,
        title: condition.title,
        message: condition.message,
        entityType: condition.entityType,
        entityId: condition.entityId,
        metadata: condition.metadata,
      },
    });

    openMap.set(condition.key, created.id);
  }

  private makeCondition(input: Omit<NotificationCondition, 'key'>): NotificationCondition {
    return {
      ...input,
      key: this.notificationKey(
        input.type,
        input.entityType,
        input.entityId,
        input.userId,
      ),
    };
  }

  private notificationKey(
    type: NotificationType,
    entityType?: string | null,
    entityId?: string | null,
    userId?: string | null,
  ) {
    return [type, entityType ?? '-', entityId ?? '-', userId ?? '-'].join(':');
  }

  private memberName(
    member: {
      memberNumber: string;
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
  ) {
    return (
      member.displayName ||
      `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() ||
      member.memberNumber
    );
  }

  private daysUntilBirthday(birthDate?: Date | null) {
    if (!birthDate) {
      return Number.POSITIVE_INFINITY;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate(),
    );

    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    return Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  private formatCredits(value: Prisma.Decimal | number | null | undefined) {
    return `${new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber(value))} CR`;
  }

  private formatQuantity(value: number) {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatGrams(value: number) {
    return `${new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)} g`;
  }

  private kgToGrams(value: Prisma.Decimal | number | null | undefined) {
    return this.toNumber(value) * 1000;
  }
}
