import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

function parseBullConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  const connection: Record<string, unknown> = {
    host: url.hostname,
    port: Number(url.port) || 6379,
  };
  // Support redis://:password@host:port and redis://user:password@host:port
  if (url.password) {
    connection.password = decodeURIComponent(url.password);
  }
  if (url.username && url.username !== 'default' && url.username !== '') {
    connection.username = decodeURIComponent(url.username);
  }
  // Support redis://host:port/db-index
  const db = url.pathname.replace('/', '');
  if (db && !Number.isNaN(Number(db))) {
    connection.db = Number(db);
  }
  return connection;
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return { connection: parseBullConnection(url) };
      },
      inject: [ConfigService],
    }),
  ],
})
export class QueueModule {}
