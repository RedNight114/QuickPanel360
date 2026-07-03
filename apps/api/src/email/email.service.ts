import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from =
      this.config.get<string>('RESEND_FROM') ??
      'QuickPanel360 <noreply@quickpanel360.com>';
  }

  async sendMemberAccessCode(opts: {
    to: string;
    name: string;
    code: string;
    clubName: string;
    expiresMinutes?: number;
  }): Promise<void> {
    const { to, name, code, clubName, expiresMinutes = 15 } = opts;

    const html = buildAccessCodeEmail({ name, code, clubName, expiresMinutes });

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject: `Tu código de acceso — ${clubName}`,
        html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`Código de acceso enviado a ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      throw err;
    }
  }
}

function buildAccessCodeEmail(opts: {
  name: string;
  code: string;
  clubName: string;
  expiresMinutes: number;
}): string {
  const { name, code, clubName, expiresMinutes } = opts;
  const digits = code.split('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Código de acceso</title>
</head>
<body style="margin:0;padding:0;background:#F2EFE6;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFE6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(21,20,15,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#15140F;padding:28px 32px;text-align:center;">
              <span style="display:inline-block;background:#FFE600;color:#15140F;font-size:20px;font-weight:900;padding:6px 16px;border-radius:8px;letter-spacing:-0.5px;">Q</span>
              <p style="margin:12px 0 0;color:#FAF8F2;font-size:13px;opacity:0.6;">QuickPanel360</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#15140F;">
                Hola, ${name}
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#5A5750;line-height:1.6;">
                Tu código de acceso para el portal de <strong style="color:#15140F;">${clubName}</strong> es:
              </p>

              <!-- Code -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  ${digits
                    .map(
                      (d) => `
                  <td style="padding:0 4px;">
                    <span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#FAF8F2;border:2px solid #E0DDD4;border-radius:10px;font-size:26px;font-weight:800;color:#15140F;letter-spacing:0;">
                      ${d}
                    </span>
                  </td>`,
                    )
                    .join('')}
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:13px;color:#7A7770;text-align:center;">
                Válido durante <strong>${expiresMinutes} minutos</strong>. No compartas este código.
              </p>

              <hr style="border:none;border-top:1px solid #E0DDD4;margin:0 0 24px;" />

              <p style="margin:0;font-size:12px;color:#A8A5A0;line-height:1.6;">
                Si no has solicitado este código, ignora este mensaje. Nadie más tiene acceso a tu cuenta.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FAF8F2;padding:16px 32px;text-align:center;border-top:1px solid #E0DDD4;">
              <p style="margin:0;font-size:11px;color:#A8A5A0;">
                Powered by <strong style="color:#15140F;">QuickAgence</strong> &mdash; QuickPanel360
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
