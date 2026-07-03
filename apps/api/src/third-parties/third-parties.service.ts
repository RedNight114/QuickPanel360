import { Injectable, NotFoundException } from '@nestjs/common';
import { ThirdPartyStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThirdPartyDto } from './dto/create-third-party.dto';
import { ThirdPartiesQueryDto } from './dto/third-parties-query.dto';
import { UpdateThirdPartyDto } from './dto/update-third-party.dto';

@Injectable()
export class ThirdPartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll(tenantId: string, query: ThirdPartiesQueryDto) {
    const where: Prisma.ThirdPartyWhereInput = {
      tenantId,
      type: query.type,
      status: query.status,
    };

    const normalizedQuery = query.q?.trim();
    if (normalizedQuery) {
      where.OR = [
        { name: { contains: normalizedQuery, mode: 'insensitive' } },
        { documentNumber: { contains: normalizedQuery, mode: 'insensitive' } },
        { phone: { contains: normalizedQuery, mode: 'insensitive' } },
        { email: { contains: normalizedQuery, mode: 'insensitive' } },
      ];
    }

    return this.prisma.thirdParty.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.take ?? 100,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });
  }

  async create(tenantId: string, userId: string, dto: CreateThirdPartyDto) {
    const thirdParty = await this.prisma.thirdParty.create({
      data: {
        tenantId,
        createdById: userId,
        name: dto.name.trim(),
        type: dto.type,
        documentNumber: dto.documentNumber,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      },
    });

    await this.auditService.createLog({
      tenantId,
      userId,
      action: 'third_party.created',
      entityType: 'third_party',
      entityId: thirdParty.id,
      newValue: this.auditValue(thirdParty),
    });

    return thirdParty;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateThirdPartyDto,
  ) {
    const existing = await this.findByTenantOrThrow(tenantId, id);

    const updated = await this.prisma.thirdParty.update({
      where: {
        id: existing.id,
      },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        documentNumber: dto.documentNumber,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
        status: dto.status,
      },
    });

    await this.auditService.createLog({
      tenantId,
      userId,
      action: 'third_party.updated',
      entityType: 'third_party',
      entityId: updated.id,
      oldValue: this.auditValue(existing),
      newValue: this.auditValue(updated),
    });

    return updated;
  }

  async archive(tenantId: string, userId: string, id: string) {
    const existing = await this.findByTenantOrThrow(tenantId, id);
    const updated = await this.prisma.thirdParty.update({
      where: {
        id: existing.id,
      },
      data: {
        status: ThirdPartyStatus.ARCHIVED,
      },
    });

    await this.auditService.createLog({
      tenantId,
      userId,
      action: 'third_party.archived',
      entityType: 'third_party',
      entityId: updated.id,
      oldValue: {
        status: existing.status,
      },
      newValue: {
        name: updated.name,
        status: updated.status,
      },
    });

    return updated;
  }

  private async findByTenantOrThrow(tenantId: string, id: string) {
    const thirdParty = await this.prisma.thirdParty.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!thirdParty) {
      throw new NotFoundException('Tercero no encontrado');
    }

    return thirdParty;
  }

  private auditValue(thirdParty: {
    id: string;
    name: string;
    type: string;
    documentNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    status: string;
  }) {
    return {
      id: thirdParty.id,
      name: thirdParty.name,
      type: thirdParty.type,
      documentNumber: thirdParty.documentNumber,
      phone: thirdParty.phone,
      email: thirdParty.email,
      notes: thirdParty.notes,
      status: thirdParty.status,
    };
  }
}
