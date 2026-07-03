import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TotpService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<{ totpEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });
    return { totpEnabled: user?.totpEnabled ?? false };
  }

  async setupTotp(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, totpEnabled: true },
    });

    if (!user) throw new UnauthorizedException();
    if (user.totpEnabled) throw new BadRequestException('El 2FA ya está activado');

    // Generate a fresh secret
    const secret = new OTPAuth.Secret({ size: 20 });
    const secretBase32 = secret.base32;

    const totp = new OTPAuth.TOTP({
      issuer: 'QuickPanel360',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();

    // Store the secret temporarily (not enabled yet — user must verify first)
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secretBase32, totpEnabled: false },
    });

    // Generate QR as data URL locally — no external service
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 1 });

    return { secret: secretBase32, otpauthUrl, qrDataUrl };
  }

  async verifyAndEnable(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpSecret) throw new BadRequestException('Primero debes iniciar la configuración del 2FA');

    const valid = this.validateCode(user.totpSecret, code);
    if (!valid) throw new BadRequestException('Código incorrecto');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });
  }

  async disable(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpEnabled) throw new BadRequestException('El 2FA no está activado');

    const valid = this.validateCode(user.totpSecret!, code);
    if (!valid) throw new BadRequestException('Código incorrecto');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    });
  }

  validateCode(secretBase32: string, code: string): boolean {
    const secret = OTPAuth.Secret.fromBase32(secretBase32);
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    // Allow ±1 window (30s before and after)
    const delta = totp.validate({ token: code.replace(/\s/g, ''), window: 1 });
    return delta !== null;
  }
}
