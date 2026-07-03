import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMemberClassDto } from './dto/upsert-member-class.dto';

@Injectable()
export class MemberClassesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.memberClassConfig.findMany({
      where: { tenantId },
      orderBy: [{ memberClass: 'asc' }],
    });
  }

  async upsert(tenantId: string, dto: UpsertMemberClassDto) {
    return this.prisma.memberClassConfig.upsert({
      where: { tenantId_memberClass: { tenantId, memberClass: dto.memberClass } },
      create: {
        tenantId,
        memberClass: dto.memberClass,
        label: dto.label,
        description: dto.description,
        suggestedBonification: dto.suggestedBonification ?? 0,
        birthdayBonification: dto.birthdayBonification ?? 0,
        requirePhoto: dto.requirePhoto ?? false,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
      update: {
        label: dto.label,
        description: dto.description,
        suggestedBonification: dto.suggestedBonification,
        birthdayBonification: dto.birthdayBonification,
        requirePhoto: dto.requirePhoto,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
  }

  async remove(tenantId: string, memberClass: MemberClass) {
    const existing = await this.prisma.memberClassConfig.findUnique({
      where: { tenantId_memberClass: { tenantId, memberClass } },
    });

    if (!existing) {
      throw new NotFoundException('Configuración de clase no encontrada');
    }

    return this.prisma.memberClassConfig.delete({
      where: { tenantId_memberClass: { tenantId, memberClass } },
    });
  }
}
