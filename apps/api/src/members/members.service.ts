import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IncidentStatus,
  MemberClass,
  MemberStatus,
  ReceivableStatus,
  SaleStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

const memberAuditSelect = {
  id: true,
  tenantId: true,
  memberNumber: true,
  firstName: true,
  lastName: true,
  displayName: true,
  documentType: true,
  documentNumber: true,
  birthDate: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  postalCode: true,
  profileNotes: true,
  internalNotes: true,
  photoUrl: true,
  photoStorageKey: true,
  status: true,
  memberClass: true,
  preferredContactMethod: true,
  marketingConsent: true,
  joinedAt: true,
  lastVisitAt: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MemberSelect;

type MemberForAudit = Prisma.MemberGetPayload<{
  select: typeof memberAuditSelect;
}>;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(tenantId: string, take = 500) {
    return this.prisma.member.findMany({
      where: {
        tenantId,
        status: {
          not: MemberStatus.DELETED,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async searchBasic(tenantId: string, query?: string) {
    const trimmedQuery = query?.trim();
    const safeSelect = {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      displayName: true,
      status: true,
      memberClass: true,
      photoUrl: true,
      phone: true,
      email: true,
      birthDate: true,
      internalNotes: true,
    } satisfies Prisma.MemberSelect;

    if (!trimmedQuery) {
      return this.prisma.member.findMany({
        where: {
          tenantId,
          status: MemberStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        select: safeSelect,
      });
    }

    const searchWhere = {
      tenantId,
      status: {
        not: MemberStatus.DELETED,
      },
      OR: [
        {
          memberNumber: {
            contains: trimmedQuery,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: trimmedQuery,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: trimmedQuery,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: trimmedQuery,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: trimmedQuery,
            mode: 'insensitive',
          },
        },
        {
          documentNumber: {
            contains: trimmedQuery,
            mode: 'insensitive',
          },
        },
      ],
    } satisfies Prisma.MemberWhereInput;

    const [activeMembers, otherMembers] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          ...searchWhere,
          status: MemberStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        select: safeSelect,
      }),
      this.prisma.member.findMany({
        where: {
          ...searchWhere,
          status: {
            notIn: [MemberStatus.ACTIVE, MemberStatus.DELETED],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        select: safeSelect,
      }),
    ]);

    return [...activeMembers, ...otherMembers].slice(0, 20);
  }

  async findOne(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: MemberStatus.DELETED,
        },
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        incidents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        sales: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    return member;
  }

  async findOneBasic(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: MemberStatus.DELETED,
        },
      },
      select: {
        id: true,
        tenantId: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        displayName: true,
        phone: true,
        email: true,
        photoUrl: true,
        status: true,
        memberClass: true,
        birthDate: true,
        internalNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    return member;
  }

  async getSummary(tenantId: string, id: string) {
    await this.ensureMemberExists(tenantId, id);

    const [sales, pendingReceivables] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId,
          memberId: id,
          status: SaleStatus.COMPLETED,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          total: true,
          amountPaid: true,
          amountPending: true,
          settlementStatus: true,
          saleType: true,
          createdAt: true,
          items: {
            select: {
              productNameSnapshot: true,
              quantity: true,
              total: true,
            },
          },
        },
      }),
      this.prisma.receivable.findMany({
        where: {
          tenantId,
          memberId: id,
          status: {
            in: [
              ReceivableStatus.OPEN,
              ReceivableStatus.PARTIALLY_PAID,
              ReceivableStatus.OVERDUE,
            ],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          originalAmount: true,
          paidAmount: true,
          outstandingAmount: true,
          status: true,
          dueDate: true,
          reason: true,
          createdAt: true,
          saleId: true,
        },
      }),
    ]);

    const totalSpent = sales.reduce(
      (sum, sale) => sum + Number(sale.total ?? 0),
      0,
    );
    const salesCount = sales.length;
    const pendingAmount = pendingReceivables.reduce(
      (sum, receivable) => sum + Number(receivable.outstandingAmount ?? 0),
      0,
    );

    return {
      totalSpent,
      salesCount,
      averageTicket: salesCount ? totalSpent / salesCount : 0,
      lastSaleAt: sales[0]?.createdAt ?? null,
      pendingAmount,
      recentSales: sales.slice(0, 10),
      receivables: pendingReceivables,
    };
  }

  async getSummaries(tenantId: string, memberIds: string[]) {
    const ids = memberIds.slice(0, 50);
    if (ids.length === 0) return {};

    const [sales, receivables] = await Promise.all([
      this.prisma.sale.groupBy({
        by: ['memberId'],
        where: {
          tenantId,
          memberId: { in: ids },
          status: SaleStatus.COMPLETED,
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.receivable.groupBy({
        by: ['memberId'],
        where: {
          tenantId,
          memberId: { in: ids },
          status: {
            in: [
              ReceivableStatus.OPEN,
              ReceivableStatus.PARTIALLY_PAID,
              ReceivableStatus.OVERDUE,
            ],
          },
        },
        _sum: { outstandingAmount: true },
        _count: { _all: true },
      }),
    ]);

    const salesMap = new Map(
      sales.map((s) => [s.memberId, { count: s._count._all, total: Number(s._sum.total ?? 0) }]),
    );
    const receivablesMap = new Map(
      receivables.map((r) => [r.memberId, { count: r._count._all, pending: Number(r._sum.outstandingAmount ?? 0) }]),
    );

    const result: Record<string, {
      salesCount: number;
      totalSpent: number;
      averageTicket: number;
      pendingAmount: number;
      pendingCount: number;
    }> = {};

    for (const id of ids) {
      const s = salesMap.get(id) ?? { count: 0, total: 0 };
      const r = receivablesMap.get(id) ?? { count: 0, pending: 0 };
      result[id] = {
        salesCount: s.count,
        totalSpent: s.total,
        averageTicket: s.count ? s.total / s.count : 0,
        pendingAmount: r.pending,
        pendingCount: r.count,
      };
    }

    return result;
  }

  async create(
    tenantId: string,
    userId: string,
    createMemberDto: CreateMemberDto,
  ) {
    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
      select: {
        autoGenerateMemberNumber: true,
        memberNumberPrefix: true,
        minimumMemberAge: true,
      },
    });
    const memberNumber =
      createMemberDto.memberNumber?.trim() ||
      (settings.autoGenerateMemberNumber
        ? await this.generateMemberNumber(tenantId, settings.memberNumberPrefix)
        : null);

    if (!memberNumber) {
      throw new BadRequestException('El número de socio es obligatorio.');
    }

    this.assertMinimumAge(createMemberDto.birthDate, settings.minimumMemberAge);

    await this.ensureMemberNumberIsAvailable(tenantId, memberNumber);

    if (createMemberDto.documentNumber) {
      await this.ensureDocumentNumberIsAvailable(
        tenantId,
        createMemberDto.documentNumber,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          tenantId,
          memberNumber,
          firstName: this.clean(createMemberDto.firstName),
          lastName: this.clean(createMemberDto.lastName),
          displayName: this.clean(createMemberDto.displayName),
          documentType: this.clean(createMemberDto.documentType),
          documentNumber: this.clean(createMemberDto.documentNumber),
          birthDate: createMemberDto.birthDate
            ? new Date(createMemberDto.birthDate)
            : undefined,
          phone: this.clean(createMemberDto.phone),
          email: this.clean(createMemberDto.email),
          address: this.clean(createMemberDto.address),
          city: this.clean(createMemberDto.city),
          postalCode: this.clean(createMemberDto.postalCode),
          profileNotes: this.clean(createMemberDto.notes),
          internalNotes: this.clean(createMemberDto.internalNotes),
          photoUrl: this.clean(createMemberDto.photoUrl),
          memberClass: createMemberDto.memberClass ?? MemberClass.STANDARD,
          preferredContactMethod: this.clean(
            createMemberDto.preferredContactMethod,
          ),
          marketingConsent: createMemberDto.marketingConsent ?? false,
          status: MemberStatus.ACTIVE,
          createdById: userId,
          updatedById: userId,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.created',
        entityType: 'member',
        entityId: member.id,
        newValue: this.toMemberCreatedAuditValue(member),
      });

      return member;
    });
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    const previousMember = await this.findMemberForAudit(tenantId, id);

    if (updateMemberDto.memberNumber) {
      await this.ensureMemberNumberIsAvailable(
        tenantId,
        updateMemberDto.memberNumber,
        id,
      );
    }

    if (updateMemberDto.documentNumber) {
      await this.ensureDocumentNumberIsAvailable(
        tenantId,
        updateMemberDto.documentNumber,
        id,
      );
    }

    if (updateMemberDto.birthDate) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { minimumMemberAge: true },
      });
      this.assertMinimumAge(updateMemberDto.birthDate, settings?.minimumMemberAge);
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.member.updateMany({
        where: {
          id,
          tenantId,
          status: {
            not: MemberStatus.DELETED,
          },
        },
        data: {
          memberNumber: updateMemberDto.memberNumber,
          firstName: this.clean(updateMemberDto.firstName),
          lastName: this.clean(updateMemberDto.lastName),
          displayName: this.clean(updateMemberDto.displayName),
          documentType: this.clean(updateMemberDto.documentType),
          documentNumber: this.clean(updateMemberDto.documentNumber),
          birthDate: updateMemberDto.birthDate
            ? new Date(updateMemberDto.birthDate)
            : undefined,
          phone: this.clean(updateMemberDto.phone),
          email: this.clean(updateMemberDto.email),
          address: this.clean(updateMemberDto.address),
          city: this.clean(updateMemberDto.city),
          postalCode: this.clean(updateMemberDto.postalCode),
          profileNotes: this.clean(updateMemberDto.notes),
          internalNotes: this.clean(updateMemberDto.internalNotes),
          photoUrl: this.clean(updateMemberDto.photoUrl),
          memberClass: updateMemberDto.memberClass,
          preferredContactMethod: this.clean(
            updateMemberDto.preferredContactMethod,
          ),
          marketingConsent: updateMemberDto.marketingConsent,
          updatedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Socio no encontrado');
      }

      const updatedMember = await tx.member.findFirst({
        where: {
          id,
          tenantId,
        },
        select: memberAuditSelect,
      });

      if (!updatedMember) {
        throw new NotFoundException('Socio no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.updated',
        entityType: 'member',
        entityId: id,
        oldValue: this.toMemberUpdatedAuditValue(previousMember),
        newValue: this.toMemberUpdatedAuditValue(updatedMember),
      });

      return this.toMemberBasicValue(updatedMember);
    });
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    id: string,
    status: MemberStatus,
  ) {
    const previousMember = await this.findMemberForAudit(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.member.updateMany({
        where: {
          id,
          tenantId,
          status: {
            not: MemberStatus.DELETED,
          },
        },
        data: {
          status,
          updatedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Socio no encontrado');
      }

      const updatedMember = await tx.member.findFirst({
        where: {
          id,
          tenantId,
        },
        select: memberAuditSelect,
      });

      if (!updatedMember) {
        throw new NotFoundException('Socio no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.status_updated',
        entityType: 'member',
        entityId: id,
        oldValue: {
          status: previousMember.status,
        },
        newValue: {
          status: updatedMember.status,
        },
      });

      return this.toMemberBasicValue(updatedMember);
    });
  }

  async updateClass(
    tenantId: string,
    userId: string,
    id: string,
    memberClass: MemberClass,
  ) {
    const previousMember = await this.findMemberForAudit(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.member.updateMany({
        where: { id, tenantId, status: { not: MemberStatus.DELETED } },
        data: {
          memberClass,
          updatedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Socio no encontrado');
      }

      const updatedMember = await tx.member.findFirstOrThrow({
        where: { id, tenantId },
        select: memberAuditSelect,
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.class_updated',
        entityType: 'member',
        entityId: id,
        oldValue: { memberClass: previousMember.memberClass },
        newValue: { memberClass: updatedMember.memberClass },
      });

      return this.toMemberBasicValue(updatedMember);
    });
  }

  async updatePhoto(
    tenantId: string,
    userId: string,
    id: string,
    photoUrl?: string,
    photoStorageKey?: string,
  ) {
    const previousMember = await this.findMemberForAudit(tenantId, id);

    // Delete old file if replacing with a new one
    if (
      photoStorageKey &&
      previousMember.photoStorageKey &&
      photoStorageKey !== previousMember.photoStorageKey
    ) {
      try {
        await this.storageService.deleteFile(previousMember.photoStorageKey);
      } catch (error) {
        // Log but don't fail if old file can't be deleted
        console.warn('Failed to delete old photo:', error);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.member.updateMany({
        where: { id, tenantId, status: { not: MemberStatus.DELETED } },
        data: {
          photoUrl: photoUrl ? this.clean(photoUrl) : undefined,
          photoStorageKey: photoStorageKey
            ? this.clean(photoStorageKey)
            : undefined,
          updatedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Socio no encontrado');
      }

      const updatedMember = await tx.member.findFirstOrThrow({
        where: { id, tenantId },
        select: memberAuditSelect,
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.photo_updated',
        entityType: 'member',
        entityId: id,
        oldValue: {
          photoUrl: previousMember.photoUrl,
          photoStorageKey: previousMember.photoStorageKey,
        },
        newValue: {
          photoUrl: updatedMember.photoUrl,
          photoStorageKey: updatedMember.photoStorageKey,
        },
      });

      return this.toMemberBasicValue(updatedMember);
    });
  }

  async uploadPhoto(
    tenantId: string,
    userId: string,
    id: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    const previousMember = await this.findMemberForAudit(tenantId, id);

    // Upload file to storage
    const storedFile = await this.storageService.uploadFile(
      fileBuffer,
      originalName,
      mimeType,
      tenantId,
      {
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
    );

    // Delete old file if exists
    if (previousMember.photoStorageKey) {
      try {
        await this.storageService.deleteFile(previousMember.photoStorageKey);
      } catch (error) {
        console.warn('Failed to delete old photo:', error);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.member.updateMany({
        where: { id, tenantId, status: { not: MemberStatus.DELETED } },
        data: {
          photoStorageKey: storedFile.storageKey,
          updatedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Socio no encontrado');
      }

      const updatedMember = await tx.member.findFirstOrThrow({
        where: { id, tenantId },
        select: memberAuditSelect,
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.photo_uploaded',
        entityType: 'member',
        entityId: id,
        oldValue: { photoStorageKey: previousMember.photoStorageKey },
        newValue: {
          photoStorageKey: updatedMember.photoStorageKey,
          fileName: originalName,
          fileSize: storedFile.sizeBytes,
        },
      });

      return {
        ...this.toMemberBasicValue(updatedMember),
        photoStorageKey: storedFile.storageKey,
      };
    });
  }

  async removePhoto(tenantId: string, userId: string, id: string) {
    const previousMember = await this.findMemberForAudit(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.member.updateMany({
        where: { id, tenantId, status: { not: MemberStatus.DELETED } },
        data: {
          photoUrl: null,
          photoStorageKey: null,
          updatedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Socio no encontrado');
      }

      const updatedMember = await tx.member.findFirstOrThrow({
        where: { id, tenantId },
        select: memberAuditSelect,
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.photo_removed',
        entityType: 'member',
        entityId: id,
        oldValue: { photoUrl: previousMember.photoUrl },
        newValue: { photoUrl: null },
      });

      return this.toMemberBasicValue(updatedMember);
    });
  }

  async getBenefits(tenantId: string) {
    await this.ensureDefaultBenefits(tenantId);

    return this.prisma.memberClassBenefit.findMany({
      where: { tenantId },
      orderBy: { memberClass: 'asc' },
    });
  }

  async updateBenefits(
    tenantId: string,
    userId: string,
    benefits: {
      memberClass: MemberClass;
      discountPercent: number;
      birthdayBenefitEnabled: boolean;
      birthdayDiscountPercent: number;
      birthdayGiftNote?: string;
      allowSpecialCreditLimit: boolean;
      creditLimitAmount: number;
      notes?: string;
    }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      for (const benefit of benefits) {
        await tx.memberClassBenefit.upsert({
          where: {
            tenantId_memberClass: {
              tenantId,
              memberClass: benefit.memberClass,
            },
          },
          update: {
            discountPercent: benefit.discountPercent,
            birthdayBenefitEnabled: benefit.birthdayBenefitEnabled,
            birthdayDiscountPercent: benefit.birthdayDiscountPercent,
            birthdayGiftNote: this.clean(benefit.birthdayGiftNote),
            allowSpecialCreditLimit: benefit.allowSpecialCreditLimit,
            creditLimitAmount: benefit.creditLimitAmount,
            notes: this.clean(benefit.notes),
          },
          create: {
            tenantId,
            memberClass: benefit.memberClass,
            discountPercent: benefit.discountPercent,
            birthdayBenefitEnabled: benefit.birthdayBenefitEnabled,
            birthdayDiscountPercent: benefit.birthdayDiscountPercent,
            birthdayGiftNote: this.clean(benefit.birthdayGiftNote),
            allowSpecialCreditLimit: benefit.allowSpecialCreditLimit,
            creditLimitAmount: benefit.creditLimitAmount,
            notes: this.clean(benefit.notes),
          },
        });
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member.benefit_updated',
        entityType: 'member_class_benefit',
        newValue: { benefits },
      });

      return tx.memberClassBenefit.findMany({
        where: { tenantId },
        orderBy: { memberClass: 'asc' },
      });
    });
  }

  async findIncidents(tenantId: string, memberId: string) {
    await this.ensureMemberExists(tenantId, memberId);

    return this.prisma.memberIncident.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createIncident(
    tenantId: string,
    userId: string,
    memberId: string,
    data: { type: string; severity?: string; description: string },
  ) {
    await this.ensureMemberExists(tenantId, memberId);

    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.memberIncident.create({
        data: {
          tenantId,
          memberId,
          type: data.type as any,
          severity: (data.severity as any) ?? 'LOW',
          description: data.description,
          createdBy: userId,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member_incident.created',
        entityType: 'member_incident',
        entityId: incident.id,
        newValue: {
          memberId,
          type: data.type,
          severity: data.severity ?? 'LOW',
          description: data.description,
        },
      });

      return incident;
    });
  }

  async resolveIncident(
    tenantId: string,
    userId: string,
    memberId: string,
    incidentId: string,
    data: { status: string; resolution?: string },
  ) {
    const incident = await this.prisma.memberIncident.findFirst({
      where: { id: incidentId, tenantId, memberId },
    });

    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    if (incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.DISMISSED) {
      throw new BadRequestException('Esta incidencia ya fue resuelta');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.memberIncident.update({
        where: { id: incidentId },
        data: {
          status: data.status as any,
          resolvedBy: userId,
          resolvedAt: new Date(),
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'member_incident.resolved',
        entityType: 'member_incident',
        entityId: incidentId,
        oldValue: { status: incident.status },
        newValue: { status: data.status, resolution: data.resolution },
      });

      return updated;
    });
  }

  async getUpcomingBirthdays(tenantId: string, days = 7) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        status: { not: MemberStatus.DELETED },
        birthDate: { not: null },
      },
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        displayName: true,
        birthDate: true,
        memberClass: true,
        photoUrl: true,
      },
    });

    return members
      .map((member) => {
        const daysUntil = this.daysUntilBirthday(member.birthDate);
        return { ...member, daysUntilBirthday: daysUntil };
      })
      .filter((member) => member.daysUntilBirthday <= days)
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  }

  private async findMemberForAudit(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: MemberStatus.DELETED,
        },
      },
      select: memberAuditSelect,
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    return member;
  }

  private clean(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private async ensureDefaultBenefits(tenantId: string) {
    const defaults = [
      {
        memberClass: MemberClass.STANDARD,
        discountPercent: 0,
        birthdayBenefitEnabled: false,
        birthdayDiscountPercent: 0,
      },
      {
        memberClass: MemberClass.PREFERRED,
        discountPercent: 3,
        birthdayBenefitEnabled: true,
        birthdayDiscountPercent: 5,
      },
      {
        memberClass: MemberClass.VIP,
        discountPercent: 5,
        birthdayBenefitEnabled: true,
        birthdayDiscountPercent: 10,
      },
    ];

    for (const benefit of defaults) {
      await this.prisma.memberClassBenefit.upsert({
        where: {
          tenantId_memberClass: {
            tenantId,
            memberClass: benefit.memberClass,
          },
        },
        update: {},
        create: {
          tenantId,
          ...benefit,
        },
      });
    }
  }

  private daysUntilBirthday(birthDate?: Date | null) {
    if (!birthDate) {
      return Number.POSITIVE_INFINITY;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate(),
    );

    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    return Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private async ensureMemberExists(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: MemberStatus.DELETED,
        },
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    return member;
  }

  private async generateMemberNumber(
    tenantId: string,
    configuredPrefix?: string | null,
  ) {
    const prefix = configuredPrefix?.trim() || 'SOC-';
    const prefixLen = prefix.length + 1;

    const result = await this.prisma.$queryRaw<[{ max_suffix: number | null }]>`
      SELECT MAX(
        CAST(SUBSTRING("memberNumber" FROM ${prefixLen}) AS INTEGER)
      ) AS max_suffix
      FROM members
      WHERE "tenantId" = ${tenantId}
        AND "memberNumber" LIKE ${prefix + '%'}
        AND SUBSTRING("memberNumber" FROM ${prefixLen}) ~ '^[0-9]+$'
    `;

    const nextSuffix = (Number(result[0]?.max_suffix) || 0) + 1;
    const candidate = `${prefix}${String(nextSuffix).padStart(4, '0')}`;

    const existing = await this.prisma.member.findFirst({
      where: { tenantId, memberNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    throw new ConflictException(
      'No se pudo generar un número de socio disponible.',
    );
  }

  private assertMinimumAge(
    birthDate?: string,
    minimumMemberAge?: number | null,
  ) {
    if (!minimumMemberAge || minimumMemberAge <= 0) {
      return;
    }

    if (!birthDate) {
      throw new BadRequestException(
        'La fecha de nacimiento es obligatoria para validar la edad mínima.',
      );
    }

    const parsedBirthDate = new Date(birthDate);
    if (Number.isNaN(parsedBirthDate.getTime())) {
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    }

    const today = new Date();
    let age = today.getFullYear() - parsedBirthDate.getFullYear();
    const birthdayThisYear = new Date(
      today.getFullYear(),
      parsedBirthDate.getMonth(),
      parsedBirthDate.getDate(),
    );

    if (birthdayThisYear > today) {
      age -= 1;
    }

    if (age < minimumMemberAge) {
      throw new BadRequestException(
        `El socio debe tener al menos ${minimumMemberAge} años.`,
      );
    }
  }

  private async ensureMemberNumberIsAvailable(
    tenantId: string,
    memberNumber: string,
    ignoredMemberId?: string,
  ) {
    const existingMember = await this.prisma.member.findFirst({
      where: {
        tenantId,
        memberNumber,
        id: ignoredMemberId
          ? {
              not: ignoredMemberId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('Ya existe un socio con ese número');
    }
  }

  private async ensureDocumentNumberIsAvailable(
    tenantId: string,
    documentNumber: string,
    ignoredMemberId?: string,
  ) {
    const existingMember = await this.prisma.member.findFirst({
      where: {
        tenantId,
        documentNumber,
        id: ignoredMemberId
          ? {
              not: ignoredMemberId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('Ya existe un socio con ese documento');
    }
  }

  private toMemberAuditValue(member: MemberForAudit): Prisma.InputJsonObject {
    return {
      id: member.id,
      tenantId: member.tenantId,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      documentType: member.documentType,
      documentNumber: member.documentNumber,
      birthDate: member.birthDate?.toISOString() ?? null,
      phone: member.phone,
      email: member.email,
      address: member.address,
      city: member.city,
      postalCode: member.postalCode,
      profileNotes: member.profileNotes,
      internalNotes: member.internalNotes,
      photoUrl: member.photoUrl,
      photoStorageKey: member.photoStorageKey,
      status: member.status,
      memberClass: member.memberClass,
      preferredContactMethod: member.preferredContactMethod,
      marketingConsent: member.marketingConsent,
      joinedAt: member.joinedAt?.toISOString() ?? null,
      lastVisitAt: member.lastVisitAt?.toISOString() ?? null,
      createdById: member.createdById,
      updatedById: member.updatedById,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }

  private toMemberCreatedAuditValue(
    member: Pick<
      MemberForAudit,
      | 'id'
      | 'memberNumber'
      | 'firstName'
      | 'lastName'
      | 'displayName'
      | 'documentType'
      | 'documentNumber'
      | 'phone'
      | 'email'
      | 'status'
      | 'memberClass'
    >,
  ): Prisma.InputJsonObject {
    return {
      id: member.id,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      documentType: member.documentType,
      documentNumber: member.documentNumber,
      phone: member.phone,
      email: member.email,
      status: member.status,
      memberClass: member.memberClass,
    };
  }

  private toMemberUpdatedAuditValue(
    member: Pick<
      MemberForAudit,
      | 'memberNumber'
      | 'firstName'
      | 'lastName'
      | 'displayName'
      | 'documentType'
      | 'documentNumber'
      | 'phone'
      | 'email'
      | 'address'
      | 'status'
      | 'memberClass'
      | 'city'
      | 'postalCode'
      | 'profileNotes'
      | 'internalNotes'
    >,
  ): Prisma.InputJsonObject {
    return {
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      documentType: member.documentType,
      documentNumber: member.documentNumber,
      phone: member.phone,
      email: member.email,
      address: member.address,
      status: member.status,
      memberClass: member.memberClass,
      city: member.city,
      postalCode: member.postalCode,
      profileNotes: member.profileNotes,
      internalNotes: member.internalNotes,
    };
  }

  async createNote(
    tenantId: string,
    userId: string,
    memberId: string,
    note: string,
    visibility: 'OWNER_ONLY' | 'MANAGER_AND_OWNER' | 'ALL_STAFF',
  ) {
    await this.prisma.member.findFirstOrThrow({
      where: { id: memberId, tenantId },
    });
    return this.prisma.memberNote.create({
      data: { tenantId, memberId, note, visibility, createdBy: userId },
    });
  }

  async deleteNote(tenantId: string, memberId: string, noteId: string) {
    await this.prisma.memberNote.deleteMany({
      where: { id: noteId, memberId, tenantId },
    });
    return { deleted: true };
  }

  private toMemberBasicValue(member: MemberForAudit) {
    return {
      id: member.id,
      tenantId: member.tenantId,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      phone: member.phone,
      email: member.email,
      photoUrl: member.photoUrl,
      status: member.status,
      memberClass: member.memberClass,
      birthDate: member.birthDate,
      internalNotes: member.internalNotes,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  async importFromCsv(tenantId: string, userId: string, buffer: Buffer) {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have headers and at least one row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const results = { created: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });

      try {
        const data: any = {};
        if (row.membernumber || row['numero'] || row['n socio']) data.memberNumber = row.membernumber || row['numero'] || row['n socio'];
        if (row.firstname || row.nombre || row.name) data.firstName = row.firstname || row.nombre || row.name;
        if (row.lastname || row.apellidos || row.apellido) data.lastName = row.lastname || row.apellidos || row.apellido;
        if (row.email) data.email = row.email;
        if (row.phone || row.telefono) data.phone = row.phone || row.telefono;
        if (row.birthdate || row['fecha nacimiento']) data.birthDate = row.birthdate || row['fecha nacimiento'];
        if (row.address || row.direccion) data.address = row.address || row.direccion;
        if (row.city || row.ciudad) data.city = row.city || row.ciudad;
        if (row.postalcode || row['codigo postal']) data.postalCode = row.postalcode || row['codigo postal'];
        if (row.notes || row.notas) data.notes = row.notes || row.notas;
        if (row.class || row.clase) {
          const cls = (row.class || row.clase || '').toUpperCase();
          if (['STANDARD', 'PREFERRED', 'VIP'].includes(cls)) data.memberClass = cls;
        }

        if (!data.firstName && !data.lastName && !data.memberNumber) {
          results.errors.push(`Fila ${i + 1}: sin nombre ni numero de socio`);
          continue;
        }

        await this.prisma.member.create({
          data: { tenantId, createdById: userId, ...data },
        });
        results.created++;
      } catch (error: any) {
        results.errors.push(`Fila ${i + 1}: ${error.message?.slice(0, 80) ?? 'error desconocido'}`);
      }
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current); current = ''; continue; }
      current += char;
    }
    values.push(current);
    return values;
  }
}
