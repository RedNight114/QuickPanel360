import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async afterSale(tenantId: string) {
    await Promise.all([
      this.cache.del(`dashboard:summary:${tenantId}`),
      this.cache.del(`dashboard:sales:${tenantId}`),
      this.cache.del(`dashboard:inventory:${tenantId}:true`),
      this.cache.del(`dashboard:inventory:${tenantId}:false`),
    ]);
  }

  async afterCashClose(tenantId: string) {
    await Promise.all([
      this.cache.del(`dashboard:summary:${tenantId}`),
      this.cache.del(`dashboard:sales:${tenantId}`),
    ]);
  }

  async afterInventoryChange(tenantId: string) {
    await Promise.all([
      this.cache.del(`dashboard:summary:${tenantId}`),
      this.cache.del(`dashboard:inventory:${tenantId}:true`),
      this.cache.del(`dashboard:inventory:${tenantId}:false`),
    ]);
  }

  async afterMemberChange(tenantId: string) {
    await this.cache.del(`dashboard:members:${tenantId}`);
  }
}
