import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return {
          store: await redisStore({ url, ttl: 60_000 }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheInvalidationService],
  exports: [CacheInvalidationService],
})
export class AppCacheModule {}
