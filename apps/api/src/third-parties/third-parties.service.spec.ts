import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ThirdPartyStatus, ThirdPartyType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThirdPartiesService } from './third-parties.service';

describe('ThirdPartiesService', () => {
  let service: ThirdPartiesService;
  let prisma: {
    thirdParty: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: { createLog: jest.Mock };

  beforeEach(async () => {
    prisma = {
      thirdParty: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = {
      createLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThirdPartiesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<ThirdPartiesService>(ThirdPartiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('applies tenant, type and status filters with the default take', async () => {
      prisma.thirdParty.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', {
        type: ThirdPartyType.SUPPLIER,
        status: ThirdPartyStatus.ACTIVE,
      });

      expect(prisma.thirdParty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            type: ThirdPartyType.SUPPLIER,
            status: ThirdPartyStatus.ACTIVE,
          },
          take: 100,
        }),
      );
    });

    it('builds an OR search filter across name, document, phone and email when q is provided', async () => {
      prisma.thirdParty.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', {
        q: '  Pedro  ',
        take: 25,
      });

      expect(prisma.thirdParty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            OR: [
              { name: { contains: 'Pedro', mode: 'insensitive' } },
              { documentNumber: { contains: 'Pedro', mode: 'insensitive' } },
              { phone: { contains: 'Pedro', mode: 'insensitive' } },
              { email: { contains: 'Pedro', mode: 'insensitive' } },
            ],
          }),
          take: 25,
        }),
      );
    });

    it('does not add an OR filter when q is blank', async () => {
      prisma.thirdParty.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', { q: '   ' });

      expect(prisma.thirdParty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            type: undefined,
            status: undefined,
          },
        }),
      );
      const call = prisma.thirdParty.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeUndefined();
    });
  });

  describe('create', () => {
    it('creates a third party trimming the name and registers an audit log', async () => {
      prisma.thirdParty.create.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Uno',
        type: ThirdPartyType.SUPPLIER,
        documentNumber: 'B12345678',
        phone: '600000000',
        email: 'proveedor@test.com',
        notes: 'Notas',
        status: ThirdPartyStatus.ACTIVE,
      });

      const result = await service.create('tenant-1', 'user-1', {
        name: '  Proveedor Uno  ',
        type: ThirdPartyType.SUPPLIER,
        documentNumber: 'B12345678',
        phone: '600000000',
        email: 'proveedor@test.com',
        notes: 'Notas',
      });

      expect(prisma.thirdParty.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          createdById: 'user-1',
          name: 'Proveedor Uno',
          type: ThirdPartyType.SUPPLIER,
          documentNumber: 'B12345678',
          phone: '600000000',
          email: 'proveedor@test.com',
          notes: 'Notas',
        },
      });

      expect(auditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'third_party.created',
          entityType: 'third_party',
          entityId: 'third-party-1',
          newValue: expect.objectContaining({
            id: 'third-party-1',
            name: 'Proveedor Uno',
          }),
        }),
      );
      expect(result.id).toBe('third-party-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the third party does not belong to the tenant', async () => {
      prisma.thirdParty.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-1', 'user-1', 'missing-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.thirdParty.update).not.toHaveBeenCalled();
    });

    it('updates an existing third party, trims the name and logs old/new values', async () => {
      prisma.thirdParty.findFirst.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Uno',
        type: ThirdPartyType.SUPPLIER,
        documentNumber: 'B12345678',
        phone: '600000000',
        email: 'old@test.com',
        notes: null,
        status: ThirdPartyStatus.ACTIVE,
      });
      prisma.thirdParty.update.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Dos',
        type: ThirdPartyType.SUPPLIER,
        documentNumber: 'B12345678',
        phone: '600000000',
        email: 'new@test.com',
        notes: null,
        status: ThirdPartyStatus.ACTIVE,
      });

      const result = await service.update(
        'tenant-1',
        'user-1',
        'third-party-1',
        {
          name: '  Proveedor Dos  ',
          email: 'new@test.com',
        },
      );

      expect(prisma.thirdParty.findFirst).toHaveBeenCalledWith({
        where: { id: 'third-party-1', tenantId: 'tenant-1' },
      });
      expect(prisma.thirdParty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'third-party-1' },
          data: expect.objectContaining({
            name: 'Proveedor Dos',
            email: 'new@test.com',
          }),
        }),
      );
      expect(auditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'third_party.updated',
          oldValue: expect.objectContaining({ email: 'old@test.com' }),
          newValue: expect.objectContaining({ email: 'new@test.com' }),
        }),
      );
      expect(result.email).toBe('new@test.com');
    });

    it('keeps the name undefined when not provided so it is not overwritten with an empty trim', async () => {
      prisma.thirdParty.findFirst.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Uno',
        type: ThirdPartyType.SUPPLIER,
        documentNumber: null,
        phone: null,
        email: null,
        notes: null,
        status: ThirdPartyStatus.ACTIVE,
      });
      prisma.thirdParty.update.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Uno',
        type: ThirdPartyType.SUPPLIER,
        documentNumber: null,
        phone: null,
        email: null,
        notes: 'Nueva nota',
        status: ThirdPartyStatus.ACTIVE,
      });

      await service.update('tenant-1', 'user-1', 'third-party-1', {
        notes: 'Nueva nota',
      });

      expect(prisma.thirdParty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: undefined,
            notes: 'Nueva nota',
          }),
        }),
      );
    });
  });

  describe('archive', () => {
    it('throws NotFoundException when the third party does not exist for the tenant', async () => {
      prisma.thirdParty.findFirst.mockResolvedValue(null);

      await expect(
        service.archive('tenant-1', 'user-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.thirdParty.update).not.toHaveBeenCalled();
    });

    it('sets the status to ARCHIVED and logs the previous status', async () => {
      prisma.thirdParty.findFirst.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Uno',
        status: ThirdPartyStatus.ACTIVE,
      });
      prisma.thirdParty.update.mockResolvedValue({
        id: 'third-party-1',
        name: 'Proveedor Uno',
        status: ThirdPartyStatus.ARCHIVED,
      });

      const result = await service.archive(
        'tenant-1',
        'user-1',
        'third-party-1',
      );

      expect(prisma.thirdParty.update).toHaveBeenCalledWith({
        where: { id: 'third-party-1' },
        data: { status: ThirdPartyStatus.ARCHIVED },
      });
      expect(auditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'third_party.archived',
          oldValue: { status: ThirdPartyStatus.ACTIVE },
          newValue: {
            name: 'Proveedor Uno',
            status: ThirdPartyStatus.ARCHIVED,
          },
        }),
      );
      expect(result.status).toBe(ThirdPartyStatus.ARCHIVED);
    });
  });
});
