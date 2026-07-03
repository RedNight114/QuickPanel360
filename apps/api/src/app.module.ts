import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { RedisModule } from './redis/redis.module';
import { AppCacheModule } from './cache/app-cache.module';
import { QueueModule } from './queue/queue.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MembersModule } from './members/members.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { PosModule } from './pos/pos.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SecurityModule } from './security/security.module';
import { SettingsModule } from './settings/settings.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { CashModule } from './cash/cash.module';
import { ThirdPartiesModule } from './third-parties/third-parties.module';
import { ThirdPartyPaymentsModule } from './third-party-payments/third-party-payments.module';
import { PlatformModule } from './platform/platform.module';
import { PublicModule } from './public/public.module';
import { ChatModule } from './chat/chat.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MemberClassesModule } from './member-classes/member-classes.module';
import { MemberAppModule } from './member-app/member-app.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 600,
      },
    ]),
    RedisModule,
    AppCacheModule,
    QueueModule,
    MetricsModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    PermissionsModule,
    MembersModule,
    ProductsModule,
    InventoryModule,
    PosModule,
    AuditModule,
    DashboardModule,
    SecurityModule,
    SettingsModule,
    ReceivablesModule,
    CashModule,
    ThirdPartiesModule,
    ThirdPartyPaymentsModule,
    PlatformModule,
    PublicModule,
    ChatModule,
    AnalyticsModule,
    NotificationsModule,
    MemberClassesModule,
    MemberAppModule,
    PushModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
