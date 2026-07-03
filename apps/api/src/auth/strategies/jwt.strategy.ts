import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definido en .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    // Validate session is not revoked
    if (payload.sid) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: payload.sid },
        select: { revokedAt: true, expiresAt: true },
      });

      if (!session || session.revokedAt) {
        throw new UnauthorizedException('Sesión revocada. Inicia sesión de nuevo.');
      }

      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        throw new UnauthorizedException('Sesión expirada. Inicia sesión de nuevo.');
      }
    }

    return {
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
  }
}
