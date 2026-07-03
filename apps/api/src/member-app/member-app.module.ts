import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';
import { MemberAppController } from './member-app.controller';
import { MemberAppService } from './member-app.service';
import { MemberAppAdminController } from './member-app-admin.controller';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthGuard } from './member-auth.guard';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    PushModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
          throw new Error('JWT_SECRET no está definido en .env');
        }

        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [MemberAuthController, MemberAppController, MemberAppAdminController],
  providers: [MemberAuthService, MemberAppService, MemberAuthGuard],
})
export class MemberAppModule {}
