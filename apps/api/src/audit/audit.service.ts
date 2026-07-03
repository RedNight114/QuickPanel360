import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

type AuditPrismaClient = PrismaService | Prisma.TransactionClient;

type CreateAuditLogParams = {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(params: CreateAuditLogParams) {
    return this.createLogWithClient(this.prisma, params);
  }

  async createLogWithClient(
    client: AuditPrismaClient,
    params: CreateAuditLogParams,
  ) {
    return client.auditLog.create({
      data: {
        tenantId: params.tenantId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  async findLogs(tenantId: string, query: AuditQueryDto) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        userId: query.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: query.take ?? 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
