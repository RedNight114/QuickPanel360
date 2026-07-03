import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:noreply@quickpanel360.com';

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not set — push notifications disabled');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('Push notifications ready');
  }

  getVapidPublicKey() {
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') ?? '' };
  }

  // ── Member subscriptions ───────────────────────────────────────────────

  async subscribeMember(tenantId: string, memberId: string, sub: PushSubscriptionJSON) {
    const { endpoint, keys } = sub as any;
    await this.prisma.memberPushSubscription.upsert({
      where: { endpoint },
      create: { tenantId, memberId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { tenantId, memberId, p256dh: keys.p256dh, auth: keys.auth },
    });
  }

  async unsubscribeMember(endpoint: string) {
    await this.prisma.memberPushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToMember(memberId: string, payload: PushPayload) {
    const subs = await this.prisma.memberPushSubscription.findMany({
      where: { memberId },
    });
    await this.sendToSubscriptions(subs, payload);
  }

  async sendToTenantMembers(tenantId: string, payload: PushPayload) {
    const subs = await this.prisma.memberPushSubscription.findMany({
      where: { tenantId },
    });
    await this.sendToSubscriptions(subs, payload);
  }

  // ── Admin subscriptions ────────────────────────────────────────────────

  async subscribeAdmin(userId: string, tenantId: string, sub: PushSubscriptionJSON) {
    const { endpoint, keys } = sub as any;
    await this.prisma.adminPushSubscription.upsert({
      where: { endpoint },
      create: { userId, tenantId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, tenantId, p256dh: keys.p256dh, auth: keys.auth },
    });
  }

  async unsubscribeAdmin(endpoint: string) {
    await this.prisma.adminPushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToAdminUser(userId: string, payload: PushPayload) {
    const subs = await this.prisma.adminPushSubscription.findMany({
      where: { userId },
    });
    await this.sendToSubscriptions(subs, payload);
  }

  async sendToTenantAdmins(tenantId: string, payload: PushPayload) {
    const subs = await this.prisma.adminPushSubscription.findMany({
      where: { tenantId },
    });
    await this.sendToSubscriptions(subs, payload);
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private async sendToSubscriptions(
    subs: Array<{ endpoint: string; p256dh: string; auth: string; id: string }>,
    payload: PushPayload,
  ) {
    if (!subs.length) return;

    const body = JSON.stringify(payload);
    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          );
        } catch (err: any) {
          // 410 Gone = subscription expired/unsubscribed
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            stale.push(s.id);
          } else {
            this.logger.warn(`Push failed for ${s.endpoint}: ${err?.message}`);
          }
        }
      }),
    );

    if (stale.length) {
      await this.prisma.memberPushSubscription.deleteMany({ where: { id: { in: stale } } }).catch(() => {});
      await this.prisma.adminPushSubscription.deleteMany({ where: { id: { in: stale } } }).catch(() => {});
    }
  }
}
