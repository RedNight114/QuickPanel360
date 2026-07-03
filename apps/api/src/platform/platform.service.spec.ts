import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessLinkStatus,
  EmergencyLockStatus,
  TenantAccessStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../security/security.service';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let prisma: {
    tenant: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    platformPlan: { findUnique: jest.Mock };
    platformModuleDefinition: { findMany: jest.Mock };
    platformPlanModule: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      create: jest.Mock;
    };
    tenantModule: { findMany: jest.Mock; upsert: jest.Mock };
    tenantSubscription: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    platformAuditLog: { create: jest.Mock };
    platformSupportSession: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    platformInvoice: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    platformPayment: { create: jest.Mock };
    emergencyLock: {
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    accessLink: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
    rolePermission: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let securityService: { regenerateAccessLink: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      platformPlan: { findUnique: jest.fn() },
      platformModuleDefinition: { findMany: jest.fn() },
      platformPlanModule: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      tenantModule: { findMany: jest.fn(), upsert: jest.fn() },
      tenantSubscription: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      platformAuditLog: { create: jest.fn() },
      platformSupportSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      platformInvoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      platformPayment: { create: jest.fn() },
      emergencyLock: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      accessLink: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
      rolePermission: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    securityService = {
      regenerateAccessLink: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.resolve(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => unknown)(prisma);
      }
      return Promise.resolve(arg);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityService, useValue: securityService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);

    // findTenant is used by several methods after mutation; stub at the
    // prisma level via tenant.findUnique by default in tests that need it.
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findTenants', () => {
    it('loads tenant metrics in batch for the listing', async () => {
      const now = new Date();
      prisma.tenant.findMany.mockResolvedValue([
        {
          id: 'tenant-1',
          name: 'Club Uno',
          legalName: 'Club Uno SL',
          taxId: 'A1',
          email: 'uno@test.com',
          phone: '600000001',
          city: 'Madrid',
          country: 'ES',
          status: TenantStatus.ACTIVE,
          accessStatus: TenantAccessStatus.ENABLED,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'tenant-2',
          name: 'Club Dos',
          legalName: 'Club Dos SL',
          taxId: 'A2',
          email: 'dos@test.com',
          phone: '600000002',
          city: 'Sevilla',
          country: 'ES',
          status: TenantStatus.SUSPENDED,
          accessStatus: TenantAccessStatus.DISABLED,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      prisma.tenantSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          tenantId: 'tenant-1',
          planId: 'plan-1',
          status: 'ACTIVE',
          trialEndsAt: null,
          endsAt: null,
          createdAt: now,
          updatedAt: now,
          plan: null,
        },
      ]);
      (prisma as any).tenantUser = {
        groupBy: jest.fn().mockResolvedValue([
          { tenantId: 'tenant-1', _count: { _all: 3 } },
          { tenantId: 'tenant-2', _count: { _all: 1 } },
        ]),
      };
      (prisma as any).member = {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ tenantId: 'tenant-1', _count: { _all: 10 } }]),
      };
      (prisma as any).sale = {
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([
            { tenantId: 'tenant-1', _count: { _all: 7 } },
            { tenantId: 'tenant-2', _count: { _all: 2 } },
          ])
          .mockResolvedValueOnce([
            { tenantId: 'tenant-1', _max: { createdAt: now } },
            {
              tenantId: 'tenant-2',
              _max: { createdAt: new Date(now.getTime() - 60_000) },
            },
          ]),
      };
      (prisma as any).posSession = {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ tenantId: 'tenant-1', _count: { _all: 1 } }]),
      };
      (prisma as any).cashMovement = {
        groupBy: jest.fn().mockResolvedValue([
          {
            tenantId: 'tenant-2',
            _max: { createdAt: new Date(now.getTime() - 30_000) },
          },
        ]),
      };
      (prisma as any).inventoryMovement = {
        groupBy: jest.fn().mockResolvedValue([]),
      };

      const result = await service.findTenants({ take: 10 });

      expect(prisma.tenant.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.tenantSubscription.findMany).toHaveBeenCalledTimes(1);
      expect((prisma as any).tenantUser.groupBy).toHaveBeenCalledTimes(1);
      expect((prisma as any).member.groupBy).toHaveBeenCalledTimes(1);
      expect((prisma as any).sale.groupBy).toHaveBeenCalledTimes(2);
      expect((prisma as any).posSession.groupBy).toHaveBeenCalledTimes(1);
      expect((prisma as any).cashMovement.groupBy).toHaveBeenCalledTimes(1);
      expect((prisma as any).inventoryMovement.groupBy).toHaveBeenCalledTimes(
        1,
      );
      expect(prisma.tenantSubscription.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'tenant-1',
            usersCount: 3,
            membersCount: 10,
            salesCount: 7,
            openCashSessions: 1,
            subscription: expect.objectContaining({ tenantId: 'tenant-1' }),
          }),
          expect.objectContaining({
            id: 'tenant-2',
            usersCount: 1,
            membersCount: 0,
            salesCount: 2,
            openCashSessions: 0,
            subscription: null,
          }),
        ]),
      );
    });
  });

  describe('createTenant', () => {
    const dto = {
      name: 'Club Verde',
      legalName: 'Club Verde SL',
      taxId: 'B12345678',
      email: 'club@test.com',
      phone: '600000000',
      city: 'Madrid',
      country: 'ES',
      ownerName: 'Owner Test',
      ownerEmail: 'Owner@Test.com',
      ownerPassword: 'supersecret123',
    };

    function mockFindTenantAfterCreate(tenantId: string) {
      // findTenant() is called at the end of createTenant; it performs a
      // tenant.findUnique with nested includes plus tenantMetrics() queries.
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        country: dto.country,
        status: TenantStatus.ACTIVE,
        accessStatus: TenantAccessStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {},
        users: [],
        subscription: null,
        modules: [],
        emergencyLocks: [],
      });
    }

    it('creates a tenant with a new owner when the email does not exist yet', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const tx = {
        tenant: {
          create: jest.fn().mockResolvedValue({
            id: 'tenant-1',
            name: dto.name,
            legalName: dto.legalName,
            taxId: dto.taxId,
            email: dto.email,
            phone: dto.phone,
            city: dto.city,
            country: dto.country,
            status: TenantStatus.ACTIVE,
            accessStatus: TenantAccessStatus.ENABLED,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        tenantUser: {
          findUnique: jest.fn(),
          create: jest.fn().mockResolvedValue({}),
        },
        tenantSubscription: {
          create: jest.fn().mockResolvedValue({}),
        },
        user: {
          update: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: 'owner-1' }),
        },
        platformAuditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );
      mockFindTenantAfterCreate('tenant-1');

      // bypass needing to mock tenantMetrics' many prisma calls by stubbing
      // every count/aggregate/findFirst used inside tenantMetrics via the
      // generic prisma mock surface added below.
      (prisma as any).tenantUser = { count: jest.fn().mockResolvedValue(1) };
      (prisma as any).member = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).product = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).sale = {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
        findFirst: jest.fn().mockResolvedValue(null),
      };
      (prisma as any).posSession = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).receivable = {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { outstandingAmount: 0 } }),
      };
      (prisma as any).cashMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
      };
      (prisma as any).inventoryMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      const result = await service.createTenant('actor-1', dto);

      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'owner@test.com',
            name: dto.ownerName,
            status: UserStatus.ACTIVE,
          }),
        }),
      );
      expect(tx.tenantUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            userId: 'owner-1',
            role: UserRole.OWNER,
            createdBy: 'actor-1',
          }),
        }),
      );
      expect(tx.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'tenant.created',
            entityType: 'tenant',
            entityId: 'tenant-1',
          }),
        }),
      );
      expect(securityService.regenerateAccessLink).toHaveBeenCalledWith(
        'tenant-1',
        'actor-1',
      );
      expect(result.id).toBe('tenant-1');
    });

    it('throws ConflictException when the existing owner already belongs to the tenant', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'owner-1' });

      const tx = {
        tenant: {
          create: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
        },
        tenantUser: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-link' }),
          create: jest.fn(),
        },
        tenantSubscription: {
          create: jest.fn(),
        },
        user: { update: jest.fn(), create: jest.fn() },
        platformAuditLog: { create: jest.fn() },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(service.createTenant('actor-1', dto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(tx.tenantUser.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePlanModules', () => {
    it('throws NotFoundException when one of the requested modules does not exist', async () => {
      prisma.platformPlan.findUnique.mockResolvedValue({ id: 'plan-1' });
      prisma.platformModuleDefinition.findMany.mockResolvedValue([
        { id: 'module-1' },
      ]);

      await expect(
        service.updatePlanModules('actor-1', 'plan-1', {
          moduleIds: ['module-1', 'module-missing'],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the plan itself does not exist', async () => {
      prisma.platformPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePlanModules('actor-1', 'missing-plan', {
          moduleIds: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('replaces the plan modules transactionally and writes an audit log', async () => {
      prisma.platformPlan.findUnique.mockResolvedValue({ id: 'plan-1' });
      prisma.platformModuleDefinition.findMany.mockResolvedValue([
        { id: 'module-1' },
        { id: 'module-2' },
      ]);
      prisma.platformPlanModule.findMany
        .mockResolvedValueOnce([
          {
            moduleId: 'module-old',
            module: { id: 'module-old', key: 'old', name: 'Old' },
          },
        ])
        .mockResolvedValueOnce([
          {
            moduleId: 'module-1',
            module: { id: 'module-1', key: 'pos', name: 'POS' },
          },
          {
            moduleId: 'module-2',
            module: { id: 'module-2', key: 'cash', name: 'Cash' },
          },
        ]);
      prisma.platformPlanModule.deleteMany.mockReturnValue({});
      prisma.platformPlanModule.create.mockReturnValue({});
      prisma.$transaction.mockResolvedValue([]);

      // findPlans() is called at the end; stub its prisma dependencies.
      (prisma as any).platformPlan.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 'plan-1' }]);
      (prisma as any).tenantSubscription.findMany = jest
        .fn()
        .mockResolvedValue([]);

      await service.updatePlanModules('actor-1', 'plan-1', {
        moduleIds: ['module-1', 'module-2'],
      });

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ]);
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'plan.modules_updated',
            entityType: 'platform_plan_modules',
            entityId: 'plan-1',
          }),
        }),
      );
    });
  });

  describe('assignTenantPlan', () => {
    function stubFindTenantAfterAssign() {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        status: TenantStatus.ACTIVE,
        accessStatus: TenantAccessStatus.ENABLED,
        settings: {},
        users: [],
        subscription: null,
        modules: [],
        emergencyLocks: [],
      });
      (prisma as any).tenantUser = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).member = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).product = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).sale = {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
        findFirst: jest.fn().mockResolvedValue(null),
      };
      (prisma as any).posSession = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).receivable = {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { outstandingAmount: 0 } }),
      };
      (prisma as any).cashMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
      };
      (prisma as any).inventoryMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
      };
    }

    it('throws NotFoundException when the tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTenantPlan('actor-1', 'missing-tenant', {
          planId: 'plan-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the requested plan does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      prisma.platformPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTenantPlan('actor-1', 'tenant-1', {
          planId: 'missing-plan',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.tenantSubscription.upsert).not.toHaveBeenCalled();
    });

    it('assigns a plan, syncs tenant modules from the plan and logs the change', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-1' }); // findTenantSnapshot
      prisma.platformPlan.findUnique.mockResolvedValue({ id: 'plan-1' });
      prisma.tenantSubscription.findUnique.mockResolvedValue(null);
      prisma.tenantSubscription.upsert.mockResolvedValue({
        id: 'subscription-1',
        tenantId: 'tenant-1',
        planId: 'plan-1',
        status: 'ACTIVE',
      });

      // syncTenantModulesFromPlan dependencies
      prisma.platformModuleDefinition.findMany.mockResolvedValue([
        { id: 'module-1' },
        { id: 'module-2' },
      ]);
      prisma.platformPlanModule.findMany.mockResolvedValue([
        { moduleId: 'module-1' },
      ]);
      prisma.tenantModule.findMany
        .mockResolvedValueOnce([]) // previous (before sync)
        .mockResolvedValueOnce([
          {
            moduleId: 'module-1',
            status: 'ENABLED',
            module: { id: 'module-1', key: 'pos', name: 'POS' },
          },
          {
            moduleId: 'module-2',
            status: 'DISABLED',
            module: { id: 'module-2', key: 'cash', name: 'Cash' },
          },
        ]); // updated (after sync)
      prisma.$transaction.mockImplementation((arg) => {
        if (Array.isArray(arg)) return Promise.resolve(arg);
        return arg(prisma);
      });

      stubFindTenantAfterAssign();

      await service.assignTenantPlan('actor-1', 'tenant-1', {
        planId: 'plan-1',
      });

      expect(prisma.tenantSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          update: expect.objectContaining({
            planId: 'plan-1',
            status: 'ACTIVE',
          }),
        }),
      );

      // syncTenantModulesFromPlan builds one upsert call per active module
      // definition and passes them as an array to $transaction (mocked
      // above to just resolve the array), so the upsert mocks themselves
      // are not invoked here — we assert on the resulting audit trail
      // instead, which reflects the synced module state.
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'tenant.plan_updated',
            entityType: 'tenant_subscription',
          }),
        }),
      );
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'tenant.modules_synced_from_plan',
            entityType: 'tenant_modules',
            entityId: 'tenant-1',
          }),
        }),
      );
    });

    it('clears the plan and skips module sync when planId is null', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-1' });
      prisma.tenantSubscription.findUnique.mockResolvedValue({
        id: 'subscription-1',
        planId: 'plan-old',
      });
      prisma.tenantSubscription.upsert.mockResolvedValue({
        id: 'subscription-1',
        tenantId: 'tenant-1',
        planId: null,
        status: 'ACTIVE',
      });
      stubFindTenantAfterAssign();

      await service.assignTenantPlan('actor-1', 'tenant-1', {
        planId: null,
      });

      expect(prisma.platformPlan.findUnique).not.toHaveBeenCalled();
      expect(prisma.tenantSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ planId: null }),
        }),
      );
      expect(prisma.platformModuleDefinition.findMany).not.toHaveBeenCalled();
    });
  });

  describe('updateTenantModules', () => {
    it('throws NotFoundException when the tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenantModules('actor-1', 'missing-tenant', {
          modules: [{ moduleId: 'module-1', enabled: true }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when a module id in the request is invalid', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-1' });
      prisma.platformModuleDefinition.findMany.mockResolvedValue([
        { id: 'module-1', key: 'pos', name: 'POS' },
      ]);
      prisma.tenantModule.findMany.mockResolvedValue([]);

      await expect(
        service.updateTenantModules('actor-1', 'tenant-1', {
          modules: [{ moduleId: 'module-unknown', enabled: true }],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.tenantModule.upsert).not.toHaveBeenCalled();
    });

    it('enables/disables modules per tenant and logs the audit diff', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-1' });
      prisma.platformModuleDefinition.findMany.mockResolvedValue([
        { id: 'module-1', key: 'pos', name: 'POS' },
        { id: 'module-2', key: 'cash', name: 'Cash' },
      ]);
      prisma.tenantModule.findMany
        .mockResolvedValueOnce([
          {
            moduleId: 'module-1',
            status: 'DISABLED',
            module: { id: 'module-1', key: 'pos', name: 'POS' },
          },
        ])
        .mockResolvedValueOnce([
          {
            moduleId: 'module-1',
            status: 'ENABLED',
            module: { id: 'module-1', key: 'pos', name: 'POS' },
          },
        ]);
      prisma.tenantModule.upsert.mockResolvedValue({});

      // findTenant() at the end
      prisma.tenant.findUnique.mockResolvedValueOnce({
        id: 'tenant-1',
        status: TenantStatus.ACTIVE,
        accessStatus: TenantAccessStatus.ENABLED,
        settings: {},
        users: [],
        subscription: null,
        modules: [],
        emergencyLocks: [],
      });
      (prisma as any).tenantUser = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).member = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).product = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).sale = {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
        findFirst: jest.fn().mockResolvedValue(null),
      };
      (prisma as any).posSession = { count: jest.fn().mockResolvedValue(0) };
      (prisma as any).receivable = {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { outstandingAmount: 0 } }),
      };
      (prisma as any).cashMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
      };
      (prisma as any).inventoryMovement = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await service.updateTenantModules('actor-1', 'tenant-1', {
        modules: [{ moduleId: 'module-1', enabled: true }],
      });

      expect(prisma.tenantModule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_moduleId: { tenantId: 'tenant-1', moduleId: 'module-1' },
          },
          update: expect.objectContaining({ status: 'ENABLED' }),
        }),
      );
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'tenant.modules_updated',
            entityType: 'tenant_modules',
            entityId: 'tenant-1',
          }),
        }),
      );
    });
  });

  describe('activateTenantEmergency / deactivateTenantEmergency', () => {
    it('throws NotFoundException when activating emergency on a missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.activateTenantEmergency('actor-1', 'missing-tenant', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a new emergency lock and revokes active access links', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

      const tx = {
        emergencyLock: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'lock-1',
            status: EmergencyLockStatus.ACTIVE,
            reason: 'Impago',
          }),
        },
        tenant: { update: jest.fn().mockResolvedValue({}) },
        accessLink: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        platformAuditLog: { create: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.activateTenantEmergency(
        'actor-1',
        'tenant-1',
        { reason: 'Impago' },
      );

      expect(tx.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { accessStatus: TenantAccessStatus.EMERGENCY_LOCKED },
      });
      expect(tx.accessLink.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', status: AccessLinkStatus.ACTIVE },
          data: expect.objectContaining({ status: AccessLinkStatus.REVOKED }),
        }),
      );
      expect(tx.emergencyLock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            status: EmergencyLockStatus.ACTIVE,
            reason: 'Impago',
            activatedById: 'actor-1',
          }),
        }),
      );
      expect(result.id).toBe('lock-1');
    });

    it('throws NotFoundException when deactivating without an active lock', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

      const tx = {
        emergencyLock: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.deactivateTenantEmergency('actor-1', 'tenant-1', {
          reason: 'Resuelto',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolves an active emergency lock and restores access', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

      const activeLock = {
        id: 'lock-1',
        status: EmergencyLockStatus.ACTIVE,
        reason: 'Impago',
        activatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      const tx = {
        emergencyLock: {
          findFirst: jest.fn().mockResolvedValue(activeLock),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'lock-1',
            status: EmergencyLockStatus.RESOLVED,
            resolutionReason: 'Pago recibido',
            deactivatedAt: new Date('2026-06-16T00:00:00Z'),
          }),
        },
        tenant: { update: jest.fn().mockResolvedValue({}) },
        platformAuditLog: { create: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.deactivateTenantEmergency(
        'actor-1',
        'tenant-1',
        { reason: 'Pago recibido' },
      );

      expect(tx.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { accessStatus: TenantAccessStatus.ENABLED },
      });
      expect(tx.emergencyLock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', status: EmergencyLockStatus.ACTIVE },
          data: expect.objectContaining({
            status: EmergencyLockStatus.RESOLVED,
            resolutionReason: 'Pago recibido',
          }),
        }),
      );
      expect(result.status).toBe(EmergencyLockStatus.RESOLVED);
    });
  });

  describe('closeSupportSession', () => {
    it('throws NotFoundException when the support session does not exist', async () => {
      prisma.platformSupportSession.findUnique.mockResolvedValue(null);

      await expect(
        service.closeSupportSession('actor-1', 'missing-session', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('is idempotent and returns the session unchanged when already closed', async () => {
      const closed = { id: 'session-1', status: 'CLOSED' };
      prisma.platformSupportSession.findUnique.mockResolvedValue(closed);

      const result = await service.closeSupportSession(
        'actor-1',
        'session-1',
        {},
      );

      expect(result).toBe(closed);
      expect(prisma.platformSupportSession.update).not.toHaveBeenCalled();
    });

    it('closes an open session and writes an audit log', async () => {
      prisma.platformSupportSession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'OPEN',
        notes: 'Notas previas',
        tenantId: 'tenant-1',
        openedAt: new Date(),
        closedAt: null,
        openedById: 'user-1',
        closedById: null,
      });
      prisma.platformSupportSession.update.mockResolvedValue({
        id: 'session-1',
        status: 'CLOSED',
        tenantId: 'tenant-1',
        notes: 'Notas previas',
        openedAt: new Date(),
        closedAt: new Date(),
        openedById: 'user-1',
        closedById: 'actor-1',
      });

      const result = await service.closeSupportSession(
        'actor-1',
        'session-1',
        {},
      );

      expect(prisma.platformSupportSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            status: 'CLOSED',
            closedById: 'actor-1',
          }),
        }),
      );
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'support.session_closed',
            entityType: 'platform_support_session',
          }),
        }),
      );
      expect(result.status).toBe('CLOSED');
    });
  });

  describe('impersonateSupportSession', () => {
    it('throws NotFoundException when the session does not exist', async () => {
      prisma.platformSupportSession.findUnique.mockResolvedValue(null);

      await expect(
        service.impersonateSupportSession('actor-1', 'missing-session'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the session is not open', async () => {
      prisma.platformSupportSession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'CLOSED',
        tenant: { id: 'tenant-1', name: 'Club' },
      });

      await expect(
        service.impersonateSupportSession('actor-1', 'session-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('issues an impersonation token with OWNER permissions for an open session', async () => {
      prisma.platformSupportSession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'OPEN',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', name: 'Club Verde', status: 'ACTIVE' },
        openedAt: new Date(),
        closedAt: null,
        openedById: 'user-1',
        closedById: null,
      });
      prisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: 'pos.sell' } },
        { permission: { key: 'cash.withdraw' } },
      ]);
      prisma.platformModuleDefinition.findMany.mockResolvedValue([
        { id: 'module-1', key: 'pos' },
        { id: 'module-2', key: 'cash' },
      ]);
      prisma.tenantModule.findMany.mockResolvedValue([
        { moduleId: 'module-2', status: 'DISABLED' },
      ]);
      prisma.user.findUnique.mockResolvedValue({
        id: 'actor-1',
        name: 'Soporte Uno',
        email: 'soporte@test.com',
      });

      const result = await service.impersonateSupportSession(
        'actor-1',
        'session-1',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'actor-1',
          tenantId: 'tenant-1',
          role: UserRole.OWNER,
          permissions: ['pos.sell', 'cash.withdraw'],
          supportSessionId: 'session-1',
          impersonatedByUserId: 'actor-1',
        }),
      );
      expect(result.accessToken).toBe('signed-token');
      expect(result.tenant.enabledModules).toEqual(['pos']);
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'support.impersonation_started',
            tenantId: 'tenant-1',
          }),
        }),
      );
    });
  });

  describe('createPayment', () => {
    it('throws NotFoundException when the tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment('actor-1', 'missing-tenant', {
          amount: 100,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the invoice does not belong to the tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      prisma.platformInvoice.findUnique.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'other-tenant',
      });

      await expect(
        service.createPayment('actor-1', 'tenant-1', {
          amount: 100,
          invoiceId: 'invoice-1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('records a payment and marks the related invoice as paid', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      prisma.platformInvoice.findUnique.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-1',
      });

      const tx = {
        platformPayment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-1',
            tenantId: 'tenant-1',
            invoiceId: 'invoice-1',
            amount: 100,
            currency: 'EUR',
            method: 'transfer',
            reference: 'REF-1',
            status: 'COMPLETED',
            paidAt: new Date('2026-06-16T00:00:00Z'),
          }),
        },
        platformInvoice: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.createPayment('actor-1', 'tenant-1', {
        amount: 100,
        invoiceId: 'invoice-1',
        method: 'transfer',
        reference: 'REF-1',
      });

      expect(tx.platformInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invoice-1' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'billing.payment_recorded',
            entityType: 'platform_payment',
            entityId: 'payment-1',
          }),
        }),
      );
      expect(result.id).toBe('payment-1');
    });

    it('records a standalone payment without touching any invoice', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

      const tx = {
        platformPayment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-2',
            tenantId: 'tenant-1',
            invoiceId: null,
            amount: 50,
            currency: 'EUR',
            status: 'COMPLETED',
            paidAt: new Date('2026-06-16T00:00:00Z'),
          }),
        },
        platformInvoice: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await service.createPayment('actor-1', 'tenant-1', {
        amount: 50,
      });

      expect(tx.platformInvoice.update).not.toHaveBeenCalled();
      expect(prisma.platformInvoice.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('renewTenantSubscription', () => {
    it('creates a renewal invoice and reactivates the subscription when payment is recorded', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      prisma.tenantSubscription.findUnique.mockResolvedValue({
        id: 'subscription-1',
        tenantId: 'tenant-1',
        planId: 'plan-1',
        status: 'SUSPENDED',
        startsAt: new Date('2026-05-01T00:00:00Z'),
        nextRenewalAt: new Date('2026-06-01T00:00:00Z'),
        endsAt: null,
        trialEndsAt: null,
        suspendedAt: new Date('2026-06-10T00:00:00Z'),
        cancelledAt: null,
        notes: 'Suspendida por impago',
        plan: { id: 'plan-1', name: 'Pro' },
      });
      prisma.platformInvoice.count.mockResolvedValue(0);

      const tx = {
        platformInvoice: {
          create: jest.fn().mockResolvedValue({
            id: 'invoice-1',
            tenantId: 'tenant-1',
            number: 'INV-2026-00001',
            amount: 99,
            currency: 'EUR',
            status: 'PAID',
            issuedAt: new Date('2026-06-19T00:00:00Z'),
            dueAt: new Date('2026-06-20T00:00:00Z'),
            paidAt: new Date('2026-06-19T00:00:00Z'),
            voidedAt: null,
            tenant: { id: 'tenant-1', name: 'Tenant 1', status: 'ACTIVE' },
            payments: [],
          }),
        },
        platformPayment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-1',
            tenantId: 'tenant-1',
            invoiceId: 'invoice-1',
            amount: 99,
            currency: 'EUR',
            method: 'transfer',
            reference: 'REN-001',
            status: 'PAID',
            paidAt: new Date('2026-06-19T00:00:00Z'),
            tenant: { id: 'tenant-1', name: 'Tenant 1', status: 'ACTIVE' },
            invoice: {
              id: 'invoice-1',
              number: 'INV-2026-00001',
              status: 'PAID',
            },
          }),
        },
        tenantSubscription: {
          upsert: jest.fn().mockResolvedValue({
            id: 'subscription-1',
            tenantId: 'tenant-1',
            planId: 'plan-1',
            status: 'ACTIVE',
            startsAt: new Date('2026-05-01T00:00:00Z'),
            nextRenewalAt: new Date('2026-07-19T00:00:00Z'),
            endsAt: null,
            trialEndsAt: null,
            suspendedAt: null,
            cancelledAt: null,
            notes: 'Suspendida por impago\nPago manual junio',
            plan: { id: 'plan-1', name: 'Pro' },
          }),
        },
        tenant: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.renewTenantSubscription(
        'actor-1',
        'tenant-1',
        {
          amount: 99,
          months: 1,
          dueAt: '2026-06-20',
          markAsPaid: true,
          paidAt: '2026-06-19',
          method: 'transfer',
          reference: 'REN-001',
          notes: 'Pago manual junio',
        },
      );

      expect(tx.platformInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            status: 'PAID',
            amount: 99,
          }),
        }),
      );
      expect(tx.platformPayment.create).toHaveBeenCalled();
      expect(tx.tenantSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: 'ACTIVE',
            suspendedAt: null,
          }),
        }),
      );
      expect(prisma.platformAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'tenant.subscription_renewed_manually',
            entityType: 'tenant_subscription',
          }),
        }),
      );
      expect(result.payment?.id).toBe('payment-1');
    });

    it('creates only the invoice when the renewal is left pending', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      prisma.tenantSubscription.findUnique.mockResolvedValue({
        id: 'subscription-1',
        tenantId: 'tenant-1',
        planId: 'plan-1',
        status: 'SUSPENDED',
        startsAt: new Date('2026-05-01T00:00:00Z'),
        nextRenewalAt: new Date('2026-06-01T00:00:00Z'),
        endsAt: null,
        trialEndsAt: null,
        suspendedAt: new Date('2026-06-10T00:00:00Z'),
        cancelledAt: null,
        notes: null,
        plan: { id: 'plan-1', name: 'Pro' },
      });
      prisma.platformInvoice.count.mockResolvedValue(0);

      const tx = {
        platformInvoice: {
          create: jest.fn().mockResolvedValue({
            id: 'invoice-2',
            tenantId: 'tenant-1',
            number: 'INV-2026-00001',
            amount: 99,
            currency: 'EUR',
            status: 'ISSUED',
            issuedAt: new Date('2026-06-19T00:00:00Z'),
            dueAt: new Date('2026-06-25T00:00:00Z'),
            paidAt: null,
            voidedAt: null,
            tenant: { id: 'tenant-1', name: 'Tenant 1', status: 'SUSPENDED' },
            payments: [],
          }),
        },
        platformPayment: {
          create: jest.fn(),
        },
        tenantSubscription: {
          upsert: jest.fn(),
        },
        tenant: {
          update: jest.fn(),
        },
      };

      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.renewTenantSubscription(
        'actor-1',
        'tenant-1',
        {
          amount: 99,
          months: 1,
          dueAt: '2026-06-25',
          markAsPaid: false,
        },
      );

      expect(tx.platformPayment.create).not.toHaveBeenCalled();
      expect(tx.tenantSubscription.upsert).not.toHaveBeenCalled();
      expect(tx.tenant.update).not.toHaveBeenCalled();
      expect(result.payment).toBeNull();
      expect(result.invoice.status).toBe('ISSUED');
    });
  });

  describe('updateInvoice', () => {
    it('throws NotFoundException when the invoice does not exist', async () => {
      prisma.platformInvoice.findUnique.mockResolvedValue(null);

      await expect(
        service.updateInvoice('actor-1', 'missing-invoice', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets paidAt when the status transitions to PAID', async () => {
      prisma.platformInvoice.findUnique.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-1',
        status: 'PENDING',
        number: 'INV-2026-00001',
        amount: 100,
        currency: 'EUR',
        issuedAt: new Date(),
        dueAt: null,
        paidAt: null,
        voidedAt: null,
      });
      prisma.platformInvoice.update.mockResolvedValue({
        id: 'invoice-1',
        tenantId: 'tenant-1',
        status: 'PAID',
        number: 'INV-2026-00001',
        amount: 100,
        currency: 'EUR',
        issuedAt: new Date(),
        dueAt: null,
        paidAt: new Date(),
        voidedAt: null,
      });

      await service.updateInvoice('actor-1', 'invoice-1', {
        status: 'PAID',
      } as any);

      expect(prisma.platformInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invoice-1' },
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
