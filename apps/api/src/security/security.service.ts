import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessLinkStatus,
  EmergencyLockStatus,
  TenantAccessStatus,
  TenantStatus,
  TenantSubscriptionStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateEmergencyDto } from './dto/activate-emergency.dto';

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async getCurrentAccessLink(tenantId: string) {
    const link = await this.prisma.accessLink.findFirst({
      where: {
        tenantId,
        status: AccessLinkStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.accessLinkSafeSelect(),
    });

    if (!link) {
      throw new NotFoundException('No hay enlace de acceso activo');
    }

    return link;
  }

  async validateAccessToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const accessLink = await this.prisma.accessLink.findUnique({
      where: {
        tokenHash,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true,
            accessStatus: true,
            subscription: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    if (!accessLink) {
      throw new UnauthorizedException('Access link inválido');
    }

    if (
      accessLink.tenant.accessStatus === TenantAccessStatus.EMERGENCY_LOCKED
    ) {
      throw new ForbiddenException(
        'El acceso público está bloqueado por modo emergencia.',
      );
    }

    if (accessLink.status !== AccessLinkStatus.ACTIVE) {
      throw new UnauthorizedException('Access link revocado o inactivo');
    }

    if (accessLink.expiresAt && accessLink.expiresAt <= new Date()) {
      throw new UnauthorizedException('Access link expirado');
    }

    if (
      accessLink.tenant.status === TenantStatus.SUSPENDED ||
      accessLink.tenant.status === TenantStatus.ARCHIVED
    ) {
      throw new ForbiddenException(
        'Esta empresa está suspendida. Contacta con soporte.',
      );
    }

    if (
      accessLink.tenant.subscription &&
      accessLink.tenant.subscription.status !== TenantSubscriptionStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'La suscripción de esta empresa no está activa. Contacta con soporte.',
      );
    }

    if (accessLink.tenant.accessStatus !== TenantAccessStatus.ENABLED) {
      throw new ForbiddenException('El club no tiene el acceso habilitado');
    }

    const usedAt = new Date();

    await this.prisma.accessLink.update({
      where: {
        id: accessLink.id,
      },
      data: {
        lastUsedAt: usedAt,
      },
    });

    await this.auditService.createLog({
      tenantId: accessLink.tenantId,
      userId: null,
      action: 'access_link.used',
      entityType: 'access_link',
      entityId: accessLink.id,
      newValue: {
        lastUsedAt: usedAt.toISOString(),
        tenantId: accessLink.tenantId,
      },
    });

    return {
      tenantId: accessLink.tenant.id,
      name: accessLink.tenant.name,
      accessStatus: accessLink.tenant.accessStatus,
    };
  }

  async regenerateAccessLink(tenantId: string, userId: string) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    return this.prisma.$transaction(async (tx) => {
      await tx.accessLink.updateMany({
        where: {
          tenantId,
          status: AccessLinkStatus.ACTIVE,
        },
        data: {
          status: AccessLinkStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: userId,
        },
      });

      const accessLink = await tx.accessLink.create({
        data: {
          tenantId,
          tokenHash,
          status: AccessLinkStatus.ACTIVE,
          createdBy: userId,
        },
        select: this.accessLinkSafeSelect(),
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'access_link.regenerated',
        entityType: 'access_link',
        entityId: accessLink.id,
        newValue: {
          status: accessLink.status,
          createdAt: accessLink.createdAt.toISOString(),
          expiresAt: accessLink.expiresAt?.toISOString() ?? null,
        },
      });

      return {
        accessLink,
        url: this.buildAccessUrl(token),
      };
    });
  }

  async activateEmergency(
    tenantId: string,
    userId: string,
    activateEmergencyDto: ActivateEmergencyDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const activeLock = await tx.emergencyLock.findFirst({
        where: {
          tenantId,
          status: EmergencyLockStatus.ACTIVE,
        },
      });

      if (activeLock) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { accessStatus: TenantAccessStatus.EMERGENCY_LOCKED },
        });

        await tx.accessLink.updateMany({
          where: {
            tenantId,
            status: AccessLinkStatus.ACTIVE,
          },
          data: {
            status: AccessLinkStatus.REVOKED,
            revokedAt: new Date(),
            revokedBy: userId,
          },
        });

        return activeLock;
      }

      await tx.tenant.update({
        where: {
          id: tenantId,
        },
        data: {
          accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
        },
      });

      await tx.accessLink.updateMany({
        where: {
          tenantId,
          status: AccessLinkStatus.ACTIVE,
        },
        data: {
          status: AccessLinkStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: userId,
        },
      });

      const emergencyLock = await tx.emergencyLock.create({
        data: {
          tenantId,
          status: EmergencyLockStatus.ACTIVE,
          reason: activateEmergencyDto.reason,
          activatedById: userId,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'emergency.activated',
        entityType: 'emergency_lock',
        entityId: emergencyLock.id,
        newValue: {
          status: emergencyLock.status,
          reason: emergencyLock.reason,
          accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
        },
      });

      await tx.platformAuditLog.create({
        data: {
          actorUserId: userId,
          tenantId,
          action: 'tenant.emergency_activated_by_tenant',
          entityType: 'emergency_lock',
          entityId: emergencyLock.id,
          newValue: {
            status: emergencyLock.status,
            reason: emergencyLock.reason,
            accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
          },
        },
      });

      return emergencyLock;
    });
  }

  deactivateEmergency(_tenantId: string, _userId: string) {
    void _tenantId;
    void _userId;
    throw new ForbiddenException(
      'Solo el administrador de la plataforma puede desactivar el modo emergencia.',
    );
  }

  async getEmergencyStatus(tenantId: string) {
    const [tenant, activeEmergencyLock, activeAccessLinks, revokedAccessLinks] =
      await Promise.all([
        this.prisma.tenant.findUnique({
          where: {
            id: tenantId,
          },
          select: {
            accessStatus: true,
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
            status: true,
            reason: true,
            activatedById: true,
            activatedAt: true,
          },
        }),
        this.prisma.accessLink.count({
          where: {
            tenantId,
            status: AccessLinkStatus.ACTIVE,
          },
        }),
        this.prisma.accessLink.count({
          where: {
            tenantId,
            status: AccessLinkStatus.REVOKED,
          },
        }),
      ]);

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return {
      accessStatus: tenant.accessStatus,
      activeEmergencyLock,
      accessLinks: {
        active: activeAccessLinks,
        revoked: revokedAccessLinks,
      },
    };
  }

  private accessLinkSafeSelect() {
    return {
      id: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
    };
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildAccessUrl(token: string) {
    const baseUrl =
      this.configService.get<string>('ACCESS_LINK_BASE_URL') ??
      'https://app.local/access';

    return `${baseUrl.replace(/\/$/, '')}/${token}`;
  }
}
