import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import {
  TenantAccessStatus,
  TenantStatus,
  TenantSubscriptionStatus,
  TenantUserStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../security/security.service';
import { TotpService } from './totp.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly securityService: SecurityService,
    private readonly totpService: TotpService,
  ) {}

  async login(loginDto: LoginDto) {
    const accessTenant = loginDto.accessToken
      ? await this.securityService.validateAccessToken(loginDto.accessToken)
      : null;

    if (
      accessTenant &&
      loginDto.tenantId &&
      loginDto.tenantId !== accessTenant.tenantId
    ) {
      throw new ForbiddenException(
        'El accessToken no pertenece al tenant solicitado',
      );
    }

    const selectedTenantId = accessTenant?.tenantId ?? loginDto.tenantId;

    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
      include: {
        tenants: {
          include: {
            tenant: {
              include: {
                subscription: true,
                settings: {
                  select: {
                    requireAccessLink: true,
                  },
                },
              },
            },
            overrides: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Usuario inactivo o bloqueado');
    }

    const passwordIsValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // If 2FA enabled and no code provided yet, signal the client to prompt for TOTP
    if (user.totpEnabled && !loginDto.totpCode) {
      return { requiresTotp: true } as any;
    }

    // If 2FA enabled and code provided, validate it
    if (user.totpEnabled && loginDto.totpCode) {
      const valid = this.totpService.validateCode(user.totpSecret!, loginDto.totpCode);
      if (!valid) throw new UnauthorizedException('Código 2FA incorrecto');
    }

    const activeTenantUsers = user.tenants.filter(
      (tenantUser) => tenantUser.status === TenantUserStatus.ACTIVE,
    );

    if (activeTenantUsers.length === 0) {
      throw new ForbiddenException('El usuario no pertenece a ningún club');
    }

    const tenantUser = selectedTenantId
      ? activeTenantUsers.find((item) => item.tenantId === selectedTenantId)
      : activeTenantUsers[0];

    if (!tenantUser) {
      throw new ForbiddenException('No tienes acceso a este club');
    }

    if (
      tenantUser.role !== UserRole.SUPERADMIN &&
      !accessTenant &&
      process.env.NODE_ENV === 'production' &&
      tenantUser.tenant.settings?.requireAccessLink !== false
    ) {
      throw new UnauthorizedException(
        'Se requiere accessToken para iniciar sesión',
      );
    }

    if (
      tenantUser.role !== UserRole.SUPERADMIN &&
      (tenantUser.tenant.status === TenantStatus.SUSPENDED ||
        tenantUser.tenant.status === TenantStatus.ARCHIVED)
    ) {
      throw new ForbiddenException(
        'Esta empresa está suspendida. Contacta con soporte.',
      );
    }

    if (
      tenantUser.role !== UserRole.SUPERADMIN &&
      tenantUser.tenant.subscription &&
      tenantUser.tenant.subscription.status !== TenantSubscriptionStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'La suscripción de esta empresa no está activa. Contacta con soporte.',
      );
    }

    if (
      tenantUser.role !== UserRole.SUPERADMIN &&
      tenantUser.tenant.accessStatus !== TenantAccessStatus.ENABLED
    ) {
      if (
        tenantUser.tenant.accessStatus === TenantAccessStatus.EMERGENCY_LOCKED
      ) {
        throw new ForbiddenException(
          'Esta empresa está en modo emergencia. Contacta con soporte para restaurar el acceso.',
        );
      }

      throw new ForbiddenException('El acceso del club está deshabilitado');
    }

    const permissions = await this.getPermissionsForTenantUser(
      tenantUser.role,
      tenantUser.id,
    );
    const enabledModules =
      tenantUser.role === UserRole.SUPERADMIN
        ? []
        : await this.getEnabledModulesForTenant(tenantUser.tenantId);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenantUser.tenantId,
      tenantUserId: tenantUser.id,
      role: tenantUser.role,
      permissions,
    };

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create session first to get the ID into the JWT
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: tenantUser.tenantId,
        tokenHash: '',
        expiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      ...payload,
      sid: session.id,
    });

    // Update session with the token hash
    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.userSession.update({
        where: { id: session.id },
        data: { tokenHash: this.hashToken(accessToken) },
      }),
    ]);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: tenantUser.role,
      },
      tenant: {
        id: tenantUser.tenant.id,
        name: tenantUser.tenant.name,
        accessStatus: tenantUser.tenant.accessStatus,
        enabledModules,
      },
      permissions,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!currentValid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Revoke all existing sessions — forces re-login on all devices
      this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Contraseña actualizada correctamente. Se han cerrado todas las sesiones activas.' };
  }

  async getSessions(userId: string, tenantId: string) {
    const now = new Date();
    return this.prisma.userSession.findMany({
      where: {
        userId,
        tenantId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        lastSeenAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: string, tenantId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId, tenantId, revokedAt: null },
    });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async revokeAllOtherSessions(userId: string, tenantId: string, currentToken: string) {
    const currentHash = this.hashToken(currentToken);
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        tenantId,
        revokedAt: null,
        NOT: { tokenHash: currentHash },
      },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async getEnabledModulesForTenant(tenantId: string) {
    const [definitions, tenantModules] = await Promise.all([
      this.prisma.platformModuleDefinition.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, key: true },
      }),
      this.prisma.tenantModule.findMany({
        where: { tenantId },
        select: { moduleId: true, status: true },
      }),
    ]);

    const configured = new Map(
      tenantModules.map((module) => [module.moduleId, module.status]),
    );

    return definitions
      .filter((definition) => configured.get(definition.id) !== 'DISABLED')
      .map((definition) => definition.key);
  }

  private async getPermissionsForTenantUser(role: any, tenantUserId: string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role,
      },
      include: {
        permission: true,
      },
    });

    const permissionSet = new Set(
      rolePermissions.map((item) => item.permission.key),
    );

    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: {
        tenantUserId,
      },
      include: {
        permission: true,
      },
    });

    for (const override of overrides) {
      if (override.allowed) {
        permissionSet.add(override.permission.key);
      } else {
        permissionSet.delete(override.permission.key);
      }
    }

    return Array.from(permissionSet);
  }
}
