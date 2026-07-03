import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, TenantUserStatus, UserRole, UserStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const tenantUserSelect = {
  id: true,
  tenantId: true,
  userId: true,
  role: true,
  status: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      lastLoginAt: true,
    },
  },
} satisfies Prisma.TenantUserSelect;

type TenantUserWithUser = Prisma.TenantUserGetPayload<{
  select: typeof tenantUserSelect;
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: string) {
    const tenantUsers = await this.prisma.tenantUser.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: tenantUserSelect,
    });

    return tenantUsers.map((tenantUser) => this.toUserResponse(tenantUser));
  }

  async findOne(tenantId: string, tenantUserId: string) {
    const tenantUser = await this.findTenantUserOrThrow(tenantId, tenantUserId);

    return this.toUserResponse(tenantUser);
  }

  async createEmployee(
    tenantId: string,
    actorUserId: string,
    createEmployeeDto: CreateEmployeeDto,
  ) {
    this.ensureManageableRole(createEmployeeDto.role);

    // Metering: check plan user limit
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { maxUsers: true } } },
    });
    if (subscription?.plan?.maxUsers) {
      const currentUsers = await this.prisma.tenantUser.count({
        where: { tenantId, status: { not: 'BLOCKED' } },
      });
      if (currentUsers >= subscription.plan.maxUsers) {
        throw new BadRequestException(
          `El plan actual permite un máximo de ${subscription.plan.maxUsers} colaboradores. Contacta con soporte para ampliar.`,
        );
      }
    }

    const email = createEmployeeDto.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(createEmployeeDto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            name: createEmployeeDto.name,
            email,
            passwordHash,
            phone: createEmployeeDto.phone,
            status: UserStatus.ACTIVE,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        });
      }

      const existingTenantUser = await tx.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: user.id,
          },
        },
      });

      if (existingTenantUser) {
        throw new ConflictException('El usuario ya pertenece a este club');
      }

      const tenantUser = await tx.tenantUser.create({
        data: {
          tenantId,
          userId: user.id,
          role: createEmployeeDto.role,
          status: TenantUserStatus.ACTIVE,
          createdBy: actorUserId,
        },
        select: tenantUserSelect,
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId: actorUserId,
        action: 'user.created',
        entityType: 'tenant_user',
        entityId: tenantUser.id,
        newValue: this.toAuditValue(tenantUser),
      });

      return this.toUserResponse(tenantUser);
    });
  }

  async update(
    tenantId: string,
    actorUserId: string,
    tenantUserId: string,
    updateUserDto: UpdateUserDto,
  ) {
    const previousTenantUser = await this.findTenantUserOrThrow(
      tenantId,
      tenantUserId,
    );

    return this.prisma.$transaction(async (tx) => {
      if (
        updateUserDto.name !== undefined ||
        updateUserDto.phone !== undefined ||
        updateUserDto.avatarUrl !== undefined
      ) {
        await tx.user.update({
          where: {
            id: previousTenantUser.userId,
          },
          data: {
            name: updateUserDto.name,
            phone: updateUserDto.phone,
            avatarUrl: updateUserDto.avatarUrl,
          },
        });
      }

      if (updateUserDto.status) {
        await tx.tenantUser.updateMany({
          where: {
            id: tenantUserId,
            tenantId,
          },
          data: {
            status: updateUserDto.status,
          },
        });
      }

      const updatedTenantUser = await tx.tenantUser.findFirst({
        where: {
          id: tenantUserId,
          tenantId,
        },
        select: tenantUserSelect,
      });

      if (!updatedTenantUser) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId: actorUserId,
        action: 'user.updated',
        entityType: 'tenant_user',
        entityId: tenantUserId,
        oldValue: this.toAuditValue(previousTenantUser),
        newValue: this.toAuditValue(updatedTenantUser),
      });

      return this.toUserResponse(updatedTenantUser);
    });
  }

  async disable(tenantId: string, actorUserId: string, tenantUserId: string) {
    const previousTenantUser = await this.findTenantUserOrThrow(
      tenantId,
      tenantUserId,
    );

    if (previousTenantUser.userId === actorUserId) {
      throw new ForbiddenException('No puedes desactivarte a ti mismo');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.tenantUser.updateMany({
        where: {
          id: tenantUserId,
          tenantId,
        },
        data: {
          status: TenantUserStatus.INACTIVE,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const disabledTenantUser = await tx.tenantUser.findFirst({
        where: {
          id: tenantUserId,
          tenantId,
        },
        select: tenantUserSelect,
      });

      if (!disabledTenantUser) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId: actorUserId,
        action: 'user.disabled',
        entityType: 'tenant_user',
        entityId: tenantUserId,
        oldValue: {
          status: previousTenantUser.status,
        },
        newValue: {
          status: disabledTenantUser.status,
        },
      });

      return this.toUserResponse(disabledTenantUser);
    });
  }

  async updateRole(
    tenantId: string,
    actorUserId: string,
    tenantUserId: string,
    updateUserRoleDto: UpdateUserRoleDto,
  ) {
    this.ensureManageableRole(updateUserRoleDto.role);

    const previousTenantUser = await this.findTenantUserOrThrow(
      tenantId,
      tenantUserId,
    );

    if (previousTenantUser.userId === actorUserId) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.tenantUser.updateMany({
        where: {
          id: tenantUserId,
          tenantId,
        },
        data: {
          role: updateUserRoleDto.role,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const updatedTenantUser = await tx.tenantUser.findFirst({
        where: {
          id: tenantUserId,
          tenantId,
        },
        select: tenantUserSelect,
      });

      if (!updatedTenantUser) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId: actorUserId,
        action: 'user.role_updated',
        entityType: 'tenant_user',
        entityId: tenantUserId,
        oldValue: {
          role: previousTenantUser.role,
        },
        newValue: {
          role: updatedTenantUser.role,
        },
      });

      return this.toUserResponse(updatedTenantUser);
    });
  }

  async getNotificationPreferences(userId: string, tenantId: string) {
    const rows = await this.prisma.userNotificationPreference.findMany({
      where: { userId, tenantId },
      select: { notificationType: true, enabled: true },
    });

    const map = new Map(rows.map((r) => [r.notificationType, r.enabled]));
    return Object.values(NotificationType).map((type) => ({
      notificationType: type,
      enabled: map.has(type) ? map.get(type)! : true,
    }));
  }

  async updateNotificationPreference(
    userId: string,
    tenantId: string,
    notificationType: NotificationType,
    enabled: boolean,
  ) {
    await this.prisma.userNotificationPreference.upsert({
      where: { userId_tenantId_notificationType: { userId, tenantId, notificationType } },
      create: { userId, tenantId, notificationType, enabled },
      update: { enabled },
    });

    return { notificationType, enabled };
  }

  private async findTenantUserOrThrow(tenantId: string, tenantUserId: string) {
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: {
        id: tenantUserId,
        tenantId,
      },
      select: tenantUserSelect,
    });

    if (!tenantUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return tenantUser;
  }

  private ensureManageableRole(role: UserRole) {
    if (role !== UserRole.MANAGER && role !== UserRole.EMPLOYEE) {
      throw new BadRequestException(
        'Solo se permiten roles MANAGER o EMPLOYEE',
      );
    }
  }

  private toUserResponse(tenantUser: TenantUserWithUser) {
    return {
      tenantUserId: tenantUser.id,
      userId: tenantUser.userId,
      name: tenantUser.user.name,
      email: tenantUser.user.email,
      phone: tenantUser.user.phone,
      avatarUrl: tenantUser.user.avatarUrl,
      role: tenantUser.role,
      status: tenantUser.status,
      createdAt: tenantUser.createdAt,
      lastLoginAt: tenantUser.user.lastLoginAt,
    };
  }

  private toAuditValue(tenantUser: TenantUserWithUser): Prisma.InputJsonObject {
    return {
      tenantUserId: tenantUser.id,
      userId: tenantUser.userId,
      name: tenantUser.user.name,
      email: tenantUser.user.email,
      phone: tenantUser.user.phone,
      avatarUrl: tenantUser.user.avatarUrl,
      role: tenantUser.role,
      status: tenantUser.status,
    };
  }

  async getUserPermissions(tenantId: string, tenantUserId: string) {
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: { id: tenantUserId, tenantId },
      select: { role: true },
    });
    if (!tenantUser) throw new NotFoundException('Usuario no encontrado');

    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { role: tenantUser.role },
      select: { permissionId: true },
    });
    const rolePermIds = new Set(rolePerms.map(rp => rp.permissionId));

    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { tenantUserId },
      select: { permissionId: true, allowed: true },
    });
    const overrideMap = new Map(overrides.map(o => [o.permissionId, o.allowed]));

    return allPermissions.map(p => ({
      id: p.id,
      key: p.key,
      description: p.description,
      module: p.module,
      roleDefault: rolePermIds.has(p.id),
      override: overrideMap.has(p.id) ? overrideMap.get(p.id) : null,
      effective: overrideMap.has(p.id) ? overrideMap.get(p.id)! : rolePermIds.has(p.id),
    }));
  }

  async updateUserPermission(
    tenantId: string,
    actorUserId: string,
    tenantUserId: string,
    permissionKey: string,
    allowed: boolean | null,
  ) {
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: { id: tenantUserId, tenantId },
    });
    if (!tenantUser) throw new NotFoundException('Usuario no encontrado');

    const permission = await this.prisma.permission.findFirst({
      where: { key: permissionKey },
    });
    if (!permission) throw new NotFoundException('Permiso no encontrado');

    if (allowed === null) {
      await this.prisma.userPermissionOverride.deleteMany({
        where: { tenantUserId, permissionId: permission.id },
      });
    } else {
      await this.prisma.userPermissionOverride.upsert({
        where: { tenantUserId_permissionId: { tenantUserId, permissionId: permission.id } },
        update: { allowed, createdBy: actorUserId },
        create: { tenantUserId, permissionId: permission.id, allowed, createdBy: actorUserId },
      });
    }

    return { success: true };
  }
}
