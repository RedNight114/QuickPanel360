import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class MemberAuthService {
  private readonly logger = new Logger(MemberAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async requestAccess(tenantId: string, email: string) {
    if (!tenantId || !email) {
      throw new BadRequestException('tenantId y email son requeridos');
    }

    const [member, tenant] = await Promise.all([
      this.prisma.member.findFirst({
        where: {
          tenantId,
          email: { equals: email, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        select: { id: true, firstName: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    if (!member) {
      // Return success even if member not found to prevent email enumeration
      return { sent: true };
    }

    // Generate 6-digit code
    const code = String(randomInt(100000, 999999));
    const tokenHash = createHash('sha256').update(code).digest('hex');

    // Revoke any existing sessions for this member that are pending
    await this.prisma.memberSession.updateMany({
      where: {
        tenantId,
        memberId: member.id,
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // Create new session with 15-minute expiry
    await this.prisma.memberSession.create({
      data: {
        tenantId,
        memberId: member.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const clubName = tenant?.name ?? 'tu club';
    const memberName = member.firstName ?? email;

    try {
      await this.emailService.sendMemberAccessCode({
        to: email,
        name: memberName,
        code,
        clubName,
        expiresMinutes: 15,
      });
    } catch (err) {
      // Log fallback so ops can still retrieve the code if email fails
      this.logger.error(`Email send failed — fallback code for ${email}: ${code}`, err);
    }

    return { sent: true };
  }

  async login(tenantId: string, email: string, code: string) {
    if (!tenantId || !email || !code) {
      throw new BadRequestException(
        'tenantId, email y code son requeridos',
      );
    }

    const member = await this.prisma.member.findFirst({
      where: {
        tenantId,
        email: { equals: email, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        memberNumber: true,
        memberClass: true,
      },
    });

    if (!member) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokenHash = createHash('sha256').update(code).digest('hex');

    const session = await this.prisma.memberSession.findFirst({
      where: {
        tenantId,
        memberId: member.id,
        tokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Código inválido o expirado');
    }

    // Mark session as used
    await this.prisma.memberSession.update({
      where: { id: session.id },
      data: { usedAt: new Date() },
    });

    // Generate JWT with member type
    const accessToken = this.jwtService.sign({
      sub: member.id,
      tenantId,
      type: 'member',
    });

    const name =
      member.displayName ??
      [member.firstName, member.lastName].filter(Boolean).join(' ') ??
      'Socio';

    return {
      accessToken,
      token: accessToken,
      member: {
        id: member.id,
        name,
        memberNumber: member.memberNumber,
        memberClass: member.memberClass,
      },
    };
  }

  async validateToken(
    token: string,
  ): Promise<{ memberId: string; tenantId: string }> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        tenantId: string;
        type: string;
      }>(token);

      if (payload.type !== 'member') {
        throw new UnauthorizedException('Token no válido para portal de socios');
      }

      return {
        memberId: payload.sub,
        tenantId: payload.tenantId,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
