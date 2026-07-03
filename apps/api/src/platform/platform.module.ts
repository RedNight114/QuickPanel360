import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityModule } from '../security/security.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

type JwtExpiresIn = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
          throw new Error('JWT_SECRET no está definido en .env');
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn:
              configService.get<JwtExpiresIn>('JWT_EXPIRES_IN') ?? '1d',
          },
        };
      },
    }),
  ],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
