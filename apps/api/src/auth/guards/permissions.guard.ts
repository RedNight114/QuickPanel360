import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TenantAccessStatus,
  TenantStatus,
  TenantSubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../types/auth-user.type';

const routeModuleMap: Record<string, string> = {
  dashboard: 'dashboard',
  analytics: 'analytics',
  notifications: 'notifications',
  pos: 'pos',
  cash: 'cash',
  members: 'members',
  products: 'products',
  inventory: 'inventory',
  receivables: 'receivables',
  'third-parties': 'third_party_payments',
  'third-party-payments': 'third_party_payments',
  users: 'users',
  chat: 'chat',
  audit: 'audit',
  security: 'security',
  settings: 'settings',
  dispensations: 'pos',
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as AuthUser;

    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          status: true,
          accessStatus: true,
          subscription: {
            select: {
              status: true,
            },
          },
        },
      });

      if (
        tenant &&
        (tenant.status === TenantStatus.SUSPENDED ||
          tenant.status === TenantStatus.ARCHIVED)
      ) {
        throw new ForbiddenException(
          'Esta empresa está suspendida. Contacta con soporte.',
        );
      }

      if (
        tenant?.accessStatus === TenantAccessStatus.EMERGENCY_LOCKED &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        !this.isEmergencyAllowedPath(request.path)
      ) {
        throw new ForbiddenException(
          'Esta empresa está en modo emergencia. Contacta con soporte para restaurar el acceso.',
        );
      }

      if (
        tenant?.subscription &&
        !user.supportSessionId &&
        tenant.subscription.status !== TenantSubscriptionStatus.ACTIVE
      ) {
        throw new ForbiddenException(
          'La suscripción de esta empresa no está activa. Contacta con soporte.',
        );
      }

    await this.assertModuleEnabled(context, user.tenantId);

    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
  }

  private async assertModuleEnabled(
    context: ExecutionContext,
    tenantId: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const firstSegment = String(request.path ?? '')
      .split('/')
      .filter(Boolean)[0];
    const moduleKey = routeModuleMap[firstSegment];

    if (!moduleKey) {
      return;
    }

    const module = await this.prisma.platformModuleDefinition.findUnique({
      where: { key: moduleKey },
      select: {
        id: true,
        tenants: {
          where: { tenantId },
          select: { status: true },
          take: 1,
        },
      },
    });

    if (module?.tenants[0]?.status === 'DISABLED') {
      throw new ForbiddenException(
        'Este módulo no está habilitado para esta empresa.',
      );
    }
  }

  private isEmergencyAllowedPath(path?: string) {
    return [
      '/security/emergency/status',
      '/security/emergency/deactivate',
    ].includes(String(path ?? ''));
  }
}
