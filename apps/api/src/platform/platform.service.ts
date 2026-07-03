import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnboardingTaskStatus,
  AccessLinkStatus,
  EmergencyLockStatus,
  Prisma,
  PlatformAccountActivityType,
  PlatformAccountHealth,
  PlatformCollectionStatus,
  TenantAccessStatus,
  TenantLifecycleStage,
  TenantRiskLevel,
  TenantStatus,
  TenantSubscriptionStatus,
  TenantUserStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../security/security.service';
import { CreatePlatformTenantDto } from './dto/create-tenant.dto';
import {
  AssignTenantPlanDto,
  CreatePlatformPlanDto,
  UpdatePlatformPlanDto,
  UpdateTenantSubscriptionDto,
} from './dto/platform-plan.dto';
import {
  CreatePlatformModuleDto,
  UpdatePlanModulesDto,
  UpdatePlatformModuleDto,
  UpdateTenantModulesDto,
} from './dto/tenant-modules.dto';
import {
  PlatformAuditQueryDto,
  PlatformBillingQueryDto,
  PlatformOnboardingQueryDto,
  PlatformSubscriptionsQueryDto,
  PlatformTenantsQueryDto,
} from './dto/tenants-query.dto';
import { UpdatePlatformTenantDto } from './dto/update-tenant.dto';
import {
  CloseSupportSessionDto,
  OpenSupportSessionDto,
} from './dto/platform-support.dto';
import {
  CreatePlatformInvoiceDto,
  CreatePlatformPaymentDto,
  RenewTenantSubscriptionDto,
  UpdatePlatformInvoiceDto,
} from './dto/platform-billing.dto';
import {
  ActivatePlatformEmergencyDto,
  ResolvePlatformEmergencyDto,
} from './dto/platform-emergency.dto';
import {
  CreateTenantContactDto,
  CreateTenantOnboardingTaskDto,
  UpdateTenantContactDto,
  UpdateTenantOnboardingTaskDto,
  UpdateTenantWorkspaceDto,
} from './dto/platform-workspace.dto';
import { ConvertLeadToTenantDto } from './dto/platform-leads.dto';
import {
  CreateTenantAccountActivityDto,
  PlatformAccountsQueryDto,
  PlatformCollectionsQueryDto,
  UpdateTenantAccountDto,
  UpdateTenantCollectionDto,
} from './dto/platform-accounts.dto';

const tenantSelect = {
  id: true,
  name: true,
  legalName: true,
  taxId: true,
  email: true,
  phone: true,
  city: true,
  country: true,
  status: true,
  accessStatus: true,
  lifecycleStage: true,
  riskLevel: true,
  accountHealth: true,
  platformNotes: true,
  lastContactAt: true,
  nextReviewAt: true,
  onboardingStartedAt: true,
  onboardingCompletedAt: true,
  activatedAt: true,
  accountOwnerId: true,
  accountOwner: {
    select: { id: true, name: true, email: true },
  },
  collectionCase: {
    select: {
      id: true,
      assignedToId: true,
      status: true,
      notes: true,
      openedAt: true,
      lastContactAt: true,
      nextActionAt: true,
      promiseDate: true,
      closedAt: true,
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantSelect;

const moduleSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  category: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlatformModuleDefinitionSelect;

const planSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  priceMonthly: true,
  currency: true,
  maxUsers: true,
  maxProducts: true,
  features: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  modules: {
    include: {
      module: {
        select: moduleSelect,
      },
    },
  },
} satisfies Prisma.PlatformPlanSelect;

const subscriptionSelect = {
  id: true,
  tenantId: true,
  planId: true,
  status: true,
  startsAt: true,
  nextRenewalAt: true,
  endsAt: true,
  trialEndsAt: true,
  suspendedAt: true,
  cancelledAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  plan: {
    select: planSelect,
  },
} satisfies Prisma.TenantSubscriptionSelect;

type TenantSnapshot = Prisma.TenantGetPayload<{ select: typeof tenantSelect }>;

const supportSessionSelect = {
  id: true,
  tenantId: true,
  openedById: true,
  closedById: true,
  reason: true,
  status: true,
  notes: true,
  openedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, name: true, status: true } },
  openedBy: { select: { id: true, name: true, email: true } },
  closedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PlatformSupportSessionSelect;

const invoiceSelect = {
  id: true,
  tenantId: true,
  number: true,
  description: true,
  amount: true,
  currency: true,
  status: true,
  issuedAt: true,
  dueAt: true,
  paidAt: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, name: true, status: true } },
  payments: {
    orderBy: { paidAt: 'desc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      reference: true,
      status: true,
      paidAt: true,
    },
  },
} satisfies Prisma.PlatformInvoiceSelect;

const paymentSelect = {
  id: true,
  tenantId: true,
  invoiceId: true,
  amount: true,
  currency: true,
  method: true,
  reference: true,
  status: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, name: true, status: true } },
  invoice: { select: { id: true, number: true, status: true } },
} satisfies Prisma.PlatformPaymentSelect;

const emergencyLockSelect = {
  id: true,
  tenantId: true,
  status: true,
  reason: true,
  resolutionReason: true,
  activatedAt: true,
  deactivatedAt: true,
  activatedBy: { select: { id: true, name: true, email: true } },
  deactivatedBy: { select: { id: true, name: true, email: true } },
  tenant: {
    select: {
      id: true,
      name: true,
      legalName: true,
      email: true,
      city: true,
      country: true,
      status: true,
      accessStatus: true,
    },
  },
} satisfies Prisma.EmergencyLockSelect;

const tenantContactSelect = {
  id: true,
  tenantId: true,
  name: true,
  role: true,
  email: true,
  phone: true,
  isPrimary: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantContactSelect;

const onboardingTaskSelect = {
  id: true,
  tenantId: true,
  title: true,
  description: true,
  status: true,
  owner: true,
  dueAt: true,
  completedAt: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantOnboardingTaskSelect;

const onboardingQueueTenantSelect = {
  id: true,
  name: true,
  legalName: true,
  email: true,
  phone: true,
  city: true,
  country: true,
  status: true,
  accessStatus: true,
  lifecycleStage: true,
  riskLevel: true,
  onboardingStartedAt: true,
  onboardingCompletedAt: true,
  lastContactAt: true,
  activatedAt: true,
  createdAt: true,
  subscription: {
    include: {
      plan: {
        select: planSelect,
      },
    },
  },
  contacts: {
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    take: 1,
    select: tenantContactSelect,
  },
  onboardingTasks: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: onboardingTaskSelect,
  },
} satisfies Prisma.TenantSelect;

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService,
    private readonly jwtService: JwtService,
  ) {}

  async syncTenantPlatformNotifications() {
    const now = new Date();
    const NotificationType = {
      TRIAL_EXPIRING: 'TRIAL_EXPIRING' as const,
      INVOICE_OVERDUE: 'INVOICE_OVERDUE' as const,
      SUSPENSION_WARNING: 'SUSPENSION_WARNING' as const,
      PLAN_LIMIT_WARNING: 'PLAN_LIMIT_WARNING' as const,
    };

    // Trial expiring in 7 days
    const trialExpiring = await this.prisma.tenantSubscription.findMany({
      where: {
        status: TenantSubscriptionStatus.TRIAL,
        trialEndsAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { tenantId: true, trialEndsAt: true },
    });

    for (const sub of trialExpiring) {
      const days = Math.ceil(
        (new Date(sub.trialEndsAt!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      await this.ensureTenantNotification(sub.tenantId, {
        type: NotificationType.TRIAL_EXPIRING,
        priority: days <= 2 ? 'CRITICAL' : 'WARNING',
        title: `Tu periodo de prueba termina en ${days} día${days !== 1 ? 's' : ''}`,
        message:
          'Contacta con el administrador de la plataforma para continuar usando el servicio sin interrupciones.',
        entityType: 'subscription',
        entityId: sub.tenantId,
      });
    }

    // Overdue invoices
    const overdueInvoices = await this.prisma.platformInvoice.findMany({
      where: { status: 'ISSUED', dueAt: { lt: now } },
      select: {
        id: true,
        tenantId: true,
        number: true,
        amount: true,
        dueAt: true,
      },
    });

    for (const inv of overdueInvoices) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(inv.dueAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      await this.ensureTenantNotification(inv.tenantId, {
        type: NotificationType.INVOICE_OVERDUE,
        priority: daysOverdue > 15 ? 'CRITICAL' : 'IMPORTANT',
        title: `Factura ${inv.number} pendiente de aportación`,
        message: `Tienes una factura de ${Number(inv.amount).toFixed(2)} CR vencida hace ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}. Regulariza la situación para evitar interrupciones.`,
        entityType: 'platform_invoice',
        entityId: inv.id,
      });
    }

    // Suspension warning: overdue > 30 days
    for (const inv of overdueInvoices) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(inv.dueAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysOverdue >= 30) {
        await this.ensureTenantNotification(inv.tenantId, {
          type: NotificationType.SUSPENSION_WARNING,
          priority: 'CRITICAL',
          title: 'Riesgo de suspensión por impago',
          message:
            'Tu club tiene facturas vencidas con más de 30 días de antigüedad. El servicio puede ser suspendido. Contacta con soporte.',
          entityType: 'platform_invoice',
          entityId: inv.id,
        });
      }
    }

    // Auto-suspend: overdue > 60 days
    for (const inv of overdueInvoices) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(inv.dueAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysOverdue >= 60) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: inv.tenantId },
          select: { id: true, status: true },
        });
        if (tenant && tenant.status === TenantStatus.ACTIVE) {
          await this.prisma.tenant.update({
            where: { id: inv.tenantId },
            data: { status: TenantStatus.SUSPENDED },
          });
          await this.prisma.platformAuditLog.create({
            data: {
              action: 'tenant.auto_suspended',
              entityType: 'tenant',
              entityId: inv.tenantId,
              newValue: {
                reason: 'Impago prolongado',
                invoiceNumber: inv.number,
                daysOverdue,
              },
            },
          });
        }
      }
    }

    // Plan limit warnings
    const activeTenants = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: {
        id: true,
        subscription: {
          include: { plan: { select: { maxUsers: true, maxProducts: true } } },
        },
        _count: { select: { users: true, products: true } },
      },
    });

    for (const t of activeTenants) {
      const maxUsers = t.subscription?.plan?.maxUsers;
      const maxProducts = t.subscription?.plan?.maxProducts;

      if (maxUsers && t._count.users >= maxUsers * 0.9) {
        await this.ensureTenantNotification(t.id, {
          type: NotificationType.PLAN_LIMIT_WARNING,
          priority: t._count.users >= maxUsers ? 'IMPORTANT' : 'WARNING',
          title:
            t._count.users >= maxUsers
              ? `Límite de colaboradores alcanzado (${t._count.users}/${maxUsers})`
              : `Cerca del límite de colaboradores (${t._count.users}/${maxUsers})`,
          message:
            'Contacta con soporte para ampliar tu plan si necesitas más colaboradores.',
          entityType: 'plan_limit',
          entityId: `users-${t.id}`,
        });
      }

      if (maxProducts && t._count.products >= maxProducts * 0.9) {
        await this.ensureTenantNotification(t.id, {
          type: NotificationType.PLAN_LIMIT_WARNING,
          priority: t._count.products >= maxProducts ? 'IMPORTANT' : 'WARNING',
          title:
            t._count.products >= maxProducts
              ? `Límite de productos alcanzado (${t._count.products}/${maxProducts})`
              : `Cerca del límite de productos (${t._count.products}/${maxProducts})`,
          message:
            'Contacta con soporte para ampliar tu plan si necesitas más productos.',
          entityType: 'plan_limit',
          entityId: `products-${t.id}`,
        });
      }
    }
  }

  private async ensureTenantNotification(
    tenantId: string,
    data: {
      type:
        | 'TRIAL_EXPIRING'
        | 'INVOICE_OVERDUE'
        | 'SUSPENSION_WARNING'
        | 'PLAN_LIMIT_WARNING';
      priority: string;
      title: string;
      message: string;
      entityType: string;
      entityId: string;
    },
  ) {
    const existing = await this.prisma.internalNotification.findFirst({
      where: {
        tenantId,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        status: { in: ['UNREAD', 'READ', 'IN_REVIEW'] },
      },
    });
    if (existing) return;

    await this.prisma.internalNotification.create({
      data: {
        tenantId,
        type: data.type,
        priority: data.priority as any,
        status: 'UNREAD',
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  }

  async generateMonthlyInvoices(actorUserId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const monthLabel = now.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });

    const activeSubscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        status: 'ACTIVE',
        plan: { priceMonthly: { gt: 0 } },
        tenant: { status: TenantStatus.ACTIVE },
      },
      include: {
        tenant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, priceMonthly: true } },
      },
    });

    const existingInvoices = await this.prisma.platformInvoice.findMany({
      where: {
        issuedAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'VOID' },
      },
      select: { tenantId: true },
    });
    const invoicedTenantIds = new Set(existingInvoices.map((i) => i.tenantId));

    const created: Array<{
      tenantName: string;
      amount: number;
      number: string;
    }> = [];

    for (const sub of activeSubscriptions) {
      if (invoicedTenantIds.has(sub.tenantId)) continue;

      const amount = Number(sub.plan?.priceMonthly ?? 0);
      if (amount <= 0) continue;

      const lastInvoice = await this.prisma.platformInvoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { number: true },
      });
      const lastNum = parseInt(
        lastInvoice?.number?.replace(/\D/g, '') ?? '0',
        10,
      );
      const invoiceNumber = `INV-${String(lastNum + created.length + 1).padStart(5, '0')}`;

      const dueAt = new Date(now.getFullYear(), now.getMonth() + 1, 15);

      const invoice = await this.prisma.platformInvoice.create({
        data: {
          tenantId: sub.tenantId,
          number: invoiceNumber,
          description: `Suscripción ${sub.plan?.name} — ${monthLabel}`,
          amount,
          status: 'ISSUED',
          issuedAt: now,
          dueAt,
        },
      });

      await this.prisma.platformAuditLog.create({
        data: {
          actorUserId,
          tenantId: sub.tenantId,
          action: 'billing.invoice_generated',
          entityType: 'platform_invoice',
          entityId: invoice.id,
          newValue: {
            number: invoiceNumber,
            amount,
            plan: sub.plan?.name,
            month: monthLabel,
          },
        },
      });

      created.push({
        tenantName: sub.tenant.name,
        amount,
        number: invoiceNumber,
      });
    }

    return {
      generated: created.length,
      skipped: activeSubscriptions.length - created.length,
      invoices: created,
    };
  }

  async getPlatformAlerts() {
    const now = new Date();
    const alerts: Array<{
      type: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      tenantId?: string;
      tenantName?: string;
    }> = [];

    // Trial expiring in next 7 days
    const trialExpiring = await this.prisma.tenantSubscription.findMany({
      where: {
        status: TenantSubscriptionStatus.TRIAL,
        trialEndsAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { tenant: { select: { id: true, name: true } } },
    });
    for (const sub of trialExpiring) {
      const days = Math.ceil(
        (new Date(sub.trialEndsAt!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      alerts.push({
        type: 'trial_expiring',
        severity: days <= 2 ? 'critical' : 'warning',
        title: `Trial expira en ${days} día${days !== 1 ? 's' : ''}`,
        description: `${sub.tenant.name} necesita asignar un plan antes de que termine el periodo de prueba.`,
        tenantId: sub.tenant.id,
        tenantName: sub.tenant.name,
      });
    }

    // Subscriptions ending in next 14 days
    const subEnding = await this.prisma.tenantSubscription.findMany({
      where: {
        status: {
          in: [
            TenantSubscriptionStatus.ACTIVE,
            TenantSubscriptionStatus.PAST_DUE,
          ],
        },
        endsAt: {
          gte: now,
          lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      },
      include: { tenant: { select: { id: true, name: true } } },
    });
    for (const sub of subEnding) {
      const days = Math.ceil(
        (new Date(sub.endsAt!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      alerts.push({
        type: 'subscription_ending',
        severity: days <= 3 ? 'critical' : 'warning',
        title: `Suscripción finaliza en ${days} día${days !== 1 ? 's' : ''}`,
        description: `La suscripción de ${sub.tenant.name} vence pronto.`,
        tenantId: sub.tenant.id,
        tenantName: sub.tenant.name,
      });
    }

    // Overdue invoices
    const overdueInvoices = await this.prisma.platformInvoice.findMany({
      where: {
        status: 'ISSUED',
        dueAt: { lt: now },
      },
      include: { tenant: { select: { id: true, name: true } } },
    });
    for (const inv of overdueInvoices) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(inv.dueAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      alerts.push({
        type: 'invoice_overdue',
        severity: daysOverdue > 15 ? 'critical' : 'warning',
        title: `Factura ${inv.number} vencida (${daysOverdue}d)`,
        description: `${inv.tenant.name} tiene una factura de ${Number(inv.amount).toFixed(2)} CR vencida.`,
        tenantId: inv.tenant.id,
        tenantName: inv.tenant.name,
      });
    }

    // Tenants without plan
    const noPlan = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
        subscription: null,
      },
      select: { id: true, name: true },
    });
    for (const t of noPlan) {
      alerts.push({
        type: 'no_plan',
        severity: 'info',
        title: 'Sin plan asignado',
        description: `${t.name} está activa pero no tiene plan de suscripción.`,
        tenantId: t.id,
        tenantName: t.name,
      });
    }

    return alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  async findLeads(status?: string, q?: string) {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (q?.trim()) {
      const search = q.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.commercialLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        requestedPlan: { select: { id: true, name: true, priceMonthly: true } },
        assignedTo: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        convertedTenant: { select: { id: true, name: true, status: true } },
      },
    });
  }

  async updateLeadStatus(
    actorUserId: string,
    id: string,
    status: string,
    internalNotes?: string,
  ) {
    const lead = await this.prisma.commercialLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Solicitud no encontrada.');
    const data: any = { status };
    if (internalNotes !== undefined) data.internalNotes = internalNotes;
    if (status === 'IN_REVIEW') {
      data.reviewedById = actorUserId;
      data.reviewedAt = new Date();
    }
    if (status === 'APPROVED') data.acceptedAt = new Date();
    if (status === 'REJECTED') data.rejectedAt = new Date();
    const updated = await this.prisma.commercialLead.update({
      where: { id },
      data,
    });
    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'lead.status_updated',
        entityType: 'commercial_lead',
        entityId: id,
        oldValue: { status: lead.status },
        newValue: { status },
      },
    });
    return updated;
  }

  async assignLead(actorUserId: string, id: string, assignedToId: string) {
    await this.prisma.commercialLead.update({
      where: { id },
      data: { assignedToId },
    });
    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'lead.assigned',
        entityType: 'commercial_lead',
        entityId: id,
        newValue: { assignedToId },
      },
    });
    return { ok: true };
  }

  async updateLeadPayment(
    actorUserId: string,
    id: string,
    paymentStatus: string,
  ) {
    await this.prisma.commercialLead.update({
      where: { id },
      data: { paymentStatus: paymentStatus as any },
    });
    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'lead.payment_updated',
        entityType: 'commercial_lead',
        entityId: id,
        newValue: { paymentStatus },
      },
    });
    return { ok: true };
  }

  async convertLeadToTenant(
    actorUserId: string,
    leadId: string,
    dto: ConvertLeadToTenantDto,
  ) {
    const lead = await this.prisma.commercialLead.findUnique({
      where: { id: leadId },
      include: {
        requestedPlan: { select: { id: true, name: true } },
        convertedTenant: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (lead.convertedTenantId) {
      throw new ConflictException('La solicitud ya fue convertida en empresa.');
    }

    if (
      !['IN_REVIEW', 'WAITING_PAYMENT', 'APPROVED', 'ACCESS_SENT'].includes(
        lead.status,
      )
    ) {
      throw new BadRequestException(
        'La solicitud debe estar revisada antes de convertirse.',
      );
    }

    const planId = dto.planId ?? lead.requestedPlanId ?? null;
    if (planId) {
      await this.findPlanSnapshot(planId);
    }

    const ownerEmail = dto.ownerEmail.toLowerCase().trim();
    const existingOwner = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true },
    });

    const tenant = await this.prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: lead.companyName.trim(),
          legalName: lead.companyName.trim(),
          email: lead.email,
          phone: lead.phone,
          country: lead.country || 'ES',
          status: TenantStatus.ACTIVE,
          accessStatus: TenantAccessStatus.ENABLED,
          lifecycleStage: TenantLifecycleStage.ONBOARDING,
          riskLevel:
            lead.paymentStatus === 'FAILED'
              ? TenantRiskLevel.HIGH
              : TenantRiskLevel.LOW,
          platformNotes: lead.internalNotes ?? lead.message ?? null,
          lastContactAt: new Date(),
          onboardingStartedAt: new Date(),
          settings: {
            create: {
              displayName: lead.companyName.trim(),
              locale:
                lead.preferredLanguage === 'en'
                  ? 'en-GB'
                  : lead.preferredLanguage === 'nl'
                    ? 'nl-NL'
                    : 'es-ES',
            },
          },
        },
        select: tenantSelect,
      });

      const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
      const owner = existingOwner
        ? await tx.user.update({
            where: { id: existingOwner.id },
            data: { name: dto.ownerName.trim(), status: UserStatus.ACTIVE },
          })
        : await tx.user.create({
            data: {
              name: dto.ownerName.trim(),
              email: ownerEmail,
              passwordHash,
              status: UserStatus.ACTIVE,
            },
          });

      await tx.tenantUser.create({
        data: {
          tenantId: createdTenant.id,
          userId: owner.id,
          role: UserRole.OWNER,
          status: TenantUserStatus.ACTIVE,
          createdBy: actorUserId,
        },
      });

      await tx.tenantSubscription.create({
        data: {
          tenantId: createdTenant.id,
          planId,
          status: TenantSubscriptionStatus.TRIAL,
          startsAt: new Date(),
          trialEndsAt: this.addDays(new Date(), 14),
          notes: `Alta desde lead ${lead.companyName}.`,
        },
      });

      await tx.tenantContact.create({
        data: {
          tenantId: createdTenant.id,
          name: lead.name.trim(),
          role: 'Contacto principal',
          email: lead.email,
          phone: lead.phone,
          isPrimary: true,
          notes: lead.message ?? lead.internalNotes ?? null,
        },
      });

      await tx.tenantOnboardingTask.createMany({
        data: [
          {
            tenantId: createdTenant.id,
            title: 'Validar datos fiscales y de contacto',
            description:
              'Revisar email, teléfono y datos identificativos del club.',
            status: OnboardingTaskStatus.PENDING,
            sortOrder: 10,
          },
          {
            tenantId: createdTenant.id,
            title: 'Asignar plan y módulos',
            description:
              'Confirmar el plan comercial y los módulos habilitados.',
            status: planId
              ? OnboardingTaskStatus.IN_PROGRESS
              : OnboardingTaskStatus.PENDING,
            sortOrder: 20,
          },
          {
            tenantId: createdTenant.id,
            title: 'Enviar acceso y credenciales',
            description:
              'Compartir acceso inicial con el responsable del club.',
            status: OnboardingTaskStatus.PENDING,
            owner: dto.ownerName.trim(),
            sortOrder: 30,
          },
          {
            tenantId: createdTenant.id,
            title: 'Acompañar configuración inicial',
            description:
              'Completar ajustes básicos y validar arranque operativo.',
            status: OnboardingTaskStatus.PENDING,
            sortOrder: 40,
          },
        ],
      });

      await tx.commercialLead.update({
        where: { id: leadId },
        data: {
          status: 'ACCESS_SENT',
          convertedTenantId: createdTenant.id,
          convertedAt: new Date(),
          reviewedById: actorUserId,
          reviewedAt: lead.reviewedAt ?? new Date(),
          acceptedAt: lead.acceptedAt ?? new Date(),
        },
      });

      await tx.platformAuditLog.create({
        data: {
          actorUserId,
          tenantId: createdTenant.id,
          action: 'lead.converted_to_tenant',
          entityType: 'commercial_lead',
          entityId: leadId,
          newValue: {
            tenantId: createdTenant.id,
            companyName: lead.companyName,
            ownerEmail,
            planId,
          },
        },
      });

      return createdTenant;
    });

    try {
      await this.securityService.regenerateAccessLink(tenant.id, actorUserId);
    } catch {
      // Best-effort in this first conversion iteration.
    }

    if (planId) {
      await this.syncTenantModulesFromPlan(actorUserId, tenant.id, planId);
    }

    return this.findTenant(tenant.id);
  }

  async getSummary() {
    // Fire-and-forget: sync platform notifications to tenants
    this.syncTenantPlatformNotifications().catch(() => {});

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      archivedTenants,
      totalUsers,
      tenantsCreatedThisMonth,
      openCashSessions,
      emergencyTenants,
      tenantsWithoutOwner,
      tenantsWithoutSettings,
      recentTenants,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.ARCHIVED } }),
      this.prisma.user.count({
        where: { status: { not: UserStatus.DELETED } },
      }),
      this.prisma.tenant.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.posSession.count({ where: { status: 'OPEN' } }),
      this.prisma.tenant.count({
        where: { accessStatus: TenantAccessStatus.EMERGENCY_LOCKED },
      }),
      this.prisma.tenant.count({
        where: {
          users: {
            none: {
              role: UserRole.OWNER,
              status: TenantUserStatus.ACTIVE,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where: { settings: null } }),
      this.findTenants({ take: 6 }),
    ]);

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      archivedTenants,
      totalUsers,
      tenantsCreatedThisMonth,
      openCashSessions,
      emergencyTenants,
      tenantsWithoutOwner,
      tenantsWithoutSettings,
      recentTenants,
    };
  }

  async getMetrics(months: number) {
    const now = new Date();
    const series: Array<{
      month: string;
      tenants: number;
      revenue: number;
      payments: number;
      newTenants: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const monthLabel = start.toLocaleDateString('es-ES', {
        month: 'short',
        year: '2-digit',
      });

      const [tenantsAtEnd, invoiceRevenue, paymentRevenue, newTenantsCount] =
        await Promise.all([
          this.prisma.tenant.count({
            where: {
              createdAt: { lte: end },
              status: { not: TenantStatus.ARCHIVED },
            },
          }),
          this.prisma.platformInvoice.aggregate({
            where: {
              issuedAt: { gte: start, lte: end },
              status: { not: 'VOID' },
            },
            _sum: { amount: true },
          }),
          this.prisma.platformPayment.aggregate({
            where: {
              paidAt: { gte: start, lte: end },
              status: { not: 'REFUNDED' },
            },
            _sum: { amount: true },
          }),
          this.prisma.tenant.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
        ]);

      series.push({
        month: monthLabel,
        tenants: tenantsAtEnd,
        revenue: Number(invoiceRevenue._sum.amount ?? 0),
        payments: Number(paymentRevenue._sum.amount ?? 0),
        newTenants: newTenantsCount,
      });
    }

    // MRR = average of active subscriptions' monthly price
    const activeSubscriptions = await this.prisma.tenantSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: { select: { priceMonthly: true } } },
    });
    const mrr = activeSubscriptions.reduce(
      (sum, sub) => sum + Number(sub.plan?.priceMonthly ?? 0),
      0,
    );

    // Usage per tenant (top 10 by activity)
    const tenantUsage = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            members: true,
            products: true,
            sales: true,
          },
        },
      },
      orderBy: { sales: { _count: 'desc' } },
      take: 10,
    });

    return {
      mrr,
      series,
      tenantUsage: tenantUsage.map((t) => ({
        id: t.id,
        name: t.name,
        users: t._count.users,
        members: t._count.members,
        products: t._count.products,
        dispensations: t._count.sales,
      })),
    };
  }

  async findTenants(query: PlatformTenantsQueryDto = {}) {
    const where: Prisma.TenantWhereInput = {};
    const q = query.q?.trim();

    if (query.status) {
      where.status = query.status;
    }

    if (query.accessStatus) {
      where.accessStatus = query.accessStatus;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.take ?? 50,
      select: tenantSelect,
    });

    return this.withTenantMetricsBatch(tenants);
  }

  async findSubscriptions(query: PlatformSubscriptionsQueryDto = {}) {
    const where: Prisma.TenantSubscriptionWhereInput = {};
    const q = query.q?.trim();

    if (query.status) {
      where.status = query.status;
    }

    if (q) {
      where.tenant = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { legalName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: query.take ?? 100,
      select: {
        ...subscriptionSelect,
        tenant: {
          select: {
            id: true,
            name: true,
            legalName: true,
            email: true,
            city: true,
            country: true,
            status: true,
            accessStatus: true,
          },
        },
      },
    });

    const tenantIds = subscriptions.map(
      (subscription) => subscription.tenantId,
    );
    const now = new Date();
    const invoices = tenantIds.length
      ? await this.prisma.platformInvoice.findMany({
          where: {
            tenantId: { in: tenantIds },
            status: { in: ['ISSUED', 'PAID'] },
          },
          select: {
            tenantId: true,
            amount: true,
            status: true,
            dueAt: true,
            paidAt: true,
          },
        })
      : [];
    const payments = tenantIds.length
      ? await this.prisma.platformPayment.findMany({
          where: { tenantId: { in: tenantIds } },
          select: {
            tenantId: true,
            amount: true,
            paidAt: true,
          },
        })
      : [];

    const billingByTenantId = new Map<
      string,
      {
        openInvoicesCount: number;
        overdueInvoicesCount: number;
        overdueAmount: number;
        lastInvoiceDueAt: Date | null;
        lastPaymentAt: Date | null;
        totalPaid: number;
      }
    >();

    for (const invoice of invoices) {
      const current = billingByTenantId.get(invoice.tenantId) ?? {
        openInvoicesCount: 0,
        overdueInvoicesCount: 0,
        overdueAmount: 0,
        lastInvoiceDueAt: null,
        lastPaymentAt: null,
        totalPaid: 0,
      };

      if (invoice.status === 'ISSUED') {
        current.openInvoicesCount += 1;
        if (invoice.dueAt && invoice.dueAt < now) {
          current.overdueInvoicesCount += 1;
          current.overdueAmount += Number(invoice.amount);
        }
      }

      if (
        invoice.dueAt &&
        (!current.lastInvoiceDueAt || invoice.dueAt > current.lastInvoiceDueAt)
      ) {
        current.lastInvoiceDueAt = invoice.dueAt;
      }

      billingByTenantId.set(invoice.tenantId, current);
    }

    for (const payment of payments) {
      const current = billingByTenantId.get(payment.tenantId) ?? {
        openInvoicesCount: 0,
        overdueInvoicesCount: 0,
        overdueAmount: 0,
        lastInvoiceDueAt: null,
        lastPaymentAt: null,
        totalPaid: 0,
      };
      current.totalPaid += Number(payment.amount);
      if (!current.lastPaymentAt || payment.paidAt > current.lastPaymentAt) {
        current.lastPaymentAt = payment.paidAt;
      }
      billingByTenantId.set(payment.tenantId, current);
    }

    return subscriptions.map((subscription) => {
      const billing = billingByTenantId.get(subscription.tenantId);
      return {
        ...subscription,
        billing: {
          openInvoicesCount: billing?.openInvoicesCount ?? 0,
          overdueInvoicesCount: billing?.overdueInvoicesCount ?? 0,
          overdueAmount: billing?.overdueAmount ?? 0,
          lastInvoiceDueAt: billing?.lastInvoiceDueAt ?? null,
          lastPaymentAt: billing?.lastPaymentAt ?? null,
          totalPaid: billing?.totalPaid ?? 0,
        },
      };
    });
  }

  async findAccounts(query: PlatformAccountsQueryDto = {}) {
    const where: Prisma.TenantWhereInput = {};
    const q = query.q?.trim();
    const now = new Date();

    if (query.accountHealth) {
      where.accountHealth = query.accountHealth;
    }

    if (query.accountOwnerId) {
      where.accountOwnerId = query.accountOwnerId;
    }

    if (query.collectionStatus) {
      where.collectionCase = {
        is: {
          status: query.collectionStatus,
        },
      };
    }

    if (query.renewalWindowDays) {
      const endsAt = new Date(
        now.getTime() + query.renewalWindowDays * 24 * 60 * 60 * 1000,
      );
      where.subscription = {
        is: {
          status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
          OR: [
            { nextRenewalAt: { gte: now, lte: endsAt } },
            { trialEndsAt: { gte: now, lte: endsAt } },
          ],
        },
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      orderBy: [{ nextReviewAt: 'asc' }, { updatedAt: 'desc' }],
      take: query.take ?? 100,
      select: tenantSelect,
    });

    const withMetrics = await this.withTenantMetricsBatch(tenants);
    const billingByTenantId = await this.billingSnapshotByTenantIds(
      withMetrics.map((tenant) => tenant.id),
    );

    return withMetrics.map((tenant) => {
      const renewalAt =
        tenant.subscription?.nextRenewalAt ?? tenant.subscription?.trialEndsAt ?? null;
      const daysToRenewal = renewalAt
        ? Math.ceil((new Date(renewalAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...tenant,
        billing: billingByTenantId.get(tenant.id) ?? this.emptyBillingSnapshot(),
        renewalAt,
        daysToRenewal,
      };
    });
  }

  async findCollections(query: PlatformCollectionsQueryDto = {}) {
    const where: Prisma.TenantCollectionCaseWhereInput = {};
    const q = query.q?.trim();

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (q) {
      where.tenant = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { legalName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const cases = await this.prisma.tenantCollectionCase.findMany({
      where,
      orderBy: [{ nextActionAt: 'asc' }, { updatedAt: 'desc' }],
      take: query.take ?? 100,
      select: {
        id: true,
        tenantId: true,
        assignedToId: true,
        status: true,
        notes: true,
        openedAt: true,
        lastContactAt: true,
        nextActionAt: true,
        promiseDate: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        tenant: { select: tenantSelect },
      },
    });

    const tenants = cases.map((item) => item.tenant);
    const withMetrics = tenants.length
      ? await this.withTenantMetricsBatch(tenants)
      : [];
    const tenantById = new Map(withMetrics.map((tenant) => [tenant.id, tenant]));
    const billingByTenantId = await this.billingSnapshotByTenantIds(
      cases.map((item) => item.tenantId),
    );

    return cases.map((item) => ({
      ...item,
      tenant: tenantById.get(item.tenantId) ?? item.tenant,
      billing: billingByTenantId.get(item.tenantId) ?? this.emptyBillingSnapshot(),
    }));
  }

  async findPlatformStaffOptions() {
    return this.prisma.user.findMany({
      where: {
        status: { not: UserStatus.DELETED },
        tenants: {
          some: {
            role: UserRole.SUPERADMIN,
            status: TenantUserStatus.ACTIVE,
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async findOnboardingQueue(query: PlatformOnboardingQueryDto = {}) {
    const where: Prisma.TenantWhereInput = {
      lifecycleStage: {
        in: ['NEW_SIGNUP', 'ONBOARDING', 'ACTIVE_AT_RISK', 'SUSPENDED'],
      },
    };
    const q = query.q?.trim();

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.lifecycleStage) {
      where.lifecycleStage = query.lifecycleStage;
    }

    if (query.riskLevel) {
      where.riskLevel = query.riskLevel;
    }

    if (query.taskStatus) {
      where.onboardingTasks = {
        some: {
          status: query.taskStatus,
        },
      };
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      take: query.take ?? 100,
      orderBy: [
        { riskLevel: 'desc' },
        { onboardingStartedAt: 'asc' },
        { createdAt: 'desc' },
      ],
      select: onboardingQueueTenantSelect,
    });

    return tenants.map((tenant) => {
      const tasks = tenant.onboardingTasks;
      const completedTasks = tasks.filter(
        (task) => task.status === OnboardingTaskStatus.COMPLETED,
      ).length;
      const pendingTasks = tasks.filter(
        (task) => task.status === OnboardingTaskStatus.PENDING,
      ).length;
      const blockedTasks = tasks.filter(
        (task) => task.status === OnboardingTaskStatus.BLOCKED,
      ).length;
      const inProgressTasks = tasks.filter(
        (task) => task.status === OnboardingTaskStatus.IN_PROGRESS,
      ).length;

      return {
        ...tenant,
        primaryContact: tenant.contacts[0] ?? null,
        metrics: {
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          blockedTasks,
          inProgressTasks,
          completionRate:
            tasks.length > 0
              ? Math.round((completedTasks / tasks.length) * 100)
              : 0,
        },
      };
    });
  }

  findEmergencies(q?: string) {
    const query = q?.trim();

    return this.prisma.emergencyLock.findMany({
      where: {
        status: EmergencyLockStatus.ACTIVE,
        tenant: {
          accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { legalName: { contains: query, mode: 'insensitive' } },
                  { email: { contains: query, mode: 'insensitive' } },
                  { city: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      orderBy: { activatedAt: 'desc' },
      take: 100,
      select: emergencyLockSelect,
    });
  }

  async findPlans() {
    const plans = await this.prisma.platformPlan.findMany({
      orderBy: [{ status: 'asc' }, { priceMonthly: 'asc' }],
      select: planSelect,
    });

    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        planId: {
          in: plans.map((plan) => plan.id),
        },
      },
      select: {
        planId: true,
        status: true,
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    return plans.map((plan) => {
      const planSubscriptions = subscriptions.filter(
        (subscription) => subscription.planId === plan.id,
      );
      const billableStatuses: TenantSubscriptionStatus[] = [
        TenantSubscriptionStatus.ACTIVE,
        TenantSubscriptionStatus.PAST_DUE,
      ];
      const activeSubscriptions = planSubscriptions.filter((subscription) =>
        billableStatuses.includes(subscription.status),
      );
      const activeTenants = activeSubscriptions.filter(
        (subscription) => subscription.tenant.status === TenantStatus.ACTIVE,
      );

      return {
        ...plan,
        metrics: {
          subscriptionsCount: planSubscriptions.length,
          activeSubscriptionsCount: activeSubscriptions.length,
          activeTenantsCount: activeTenants.length,
          estimatedMonthlyRevenue:
            activeTenants.length * Number(plan.priceMonthly ?? 0),
        },
      };
    });
  }

  findModules() {
    return this.prisma.platformModuleDefinition.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: moduleSelect,
    });
  }

  async createModule(actorUserId: string, dto: CreatePlatformModuleDto) {
    const module = await this.prisma.platformModuleDefinition.create({
      data: {
        key: dto.key.toLowerCase().trim(),
        name: dto.name,
        description: dto.description,
        category: dto.category ?? 'Operativa',
        sortOrder: dto.sortOrder ?? 0,
      },
      select: moduleSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'module.created',
        entityType: 'platform_module',
        entityId: module.id,
        newValue: this.moduleAuditValue(module),
      },
    });

    return module;
  }

  async updateModule(
    actorUserId: string,
    id: string,
    dto: UpdatePlatformModuleDto,
  ) {
    const previous = await this.findModuleSnapshot(id);
    const updated = await this.prisma.platformModuleDefinition.update({
      where: { id },
      data: {
        ...dto,
        key: dto.key ? dto.key.toLowerCase().trim() : undefined,
      },
      select: moduleSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'module.updated',
        entityType: 'platform_module',
        entityId: id,
        oldValue: this.moduleAuditValue(previous),
        newValue: this.moduleAuditValue(updated),
      },
    });

    return updated;
  }

  async archiveModule(actorUserId: string, id: string) {
    const previous = await this.findModuleSnapshot(id);
    const updated = await this.prisma.platformModuleDefinition.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      select: moduleSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'module.archived',
        entityType: 'platform_module',
        entityId: id,
        oldValue: this.moduleAuditValue(previous),
        newValue: this.moduleAuditValue(updated),
      },
    });

    return updated;
  }

  async createPlan(actorUserId: string, dto: CreatePlatformPlanDto) {
    const plan = await this.prisma.platformPlan.create({
      data: {
        ...dto,
        code: dto.code.toLowerCase().trim(),
        currency: dto.currency ?? 'EUR',
      },
      select: planSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'plan.created',
        entityType: 'platform_plan',
        entityId: plan.id,
        newValue: this.planAuditValue(plan),
      },
    });

    return plan;
  }

  async updatePlan(
    actorUserId: string,
    id: string,
    dto: UpdatePlatformPlanDto,
  ) {
    const previous = await this.findPlanSnapshot(id);
    const updated = await this.prisma.platformPlan.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toLowerCase().trim() : undefined,
      },
      select: planSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'plan.updated',
        entityType: 'platform_plan',
        entityId: id,
        oldValue: this.planAuditValue(previous),
        newValue: this.planAuditValue(updated),
      },
    });

    return updated;
  }

  async archivePlan(actorUserId: string, id: string) {
    const previous = await this.findPlanSnapshot(id);
    const updated = await this.prisma.platformPlan.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      select: planSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'plan.archived',
        entityType: 'platform_plan',
        entityId: id,
        oldValue: this.planAuditValue(previous),
        newValue: this.planAuditValue(updated),
      },
    });

    return updated;
  }

  async updatePlanModules(
    actorUserId: string,
    id: string,
    dto: UpdatePlanModulesDto,
  ) {
    await this.findPlanSnapshot(id);
    const validModules = await this.prisma.platformModuleDefinition.findMany({
      where: { id: { in: dto.moduleIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (validModules.length !== dto.moduleIds.length) {
      throw new NotFoundException('Uno o más módulos no existen');
    }

    const previous = await this.prisma.platformPlanModule.findMany({
      where: { planId: id },
      include: { module: { select: moduleSelect } },
    });

    await this.prisma.$transaction([
      this.prisma.platformPlanModule.deleteMany({ where: { planId: id } }),
      ...dto.moduleIds.map((moduleId) =>
        this.prisma.platformPlanModule.create({
          data: { planId: id, moduleId },
        }),
      ),
    ]);

    const updated = await this.prisma.platformPlanModule.findMany({
      where: { planId: id },
      include: { module: { select: moduleSelect } },
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: 'plan.modules_updated',
        entityType: 'platform_plan_modules',
        entityId: id,
        oldValue: this.planModulesAuditValue(previous),
        newValue: this.planModulesAuditValue(updated),
      },
    });

    return this.findPlans();
  }

  async createTenant(actorUserId: string, dto: CreatePlatformTenantDto) {
    const ownerEmail = dto.ownerEmail.toLowerCase().trim();
    const existingOwner = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true },
    });

    return this.prisma
      .$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.name,
            legalName: dto.legalName,
            taxId: dto.taxId,
            email: dto.email,
            phone: dto.phone,
            city: dto.city,
            country: dto.country ?? 'ES',
            status: TenantStatus.ACTIVE,
            accessStatus: TenantAccessStatus.ENABLED,
            settings: {
              create: {
                displayName: dto.name,
              },
            },
          },
          select: tenantSelect,
        });

        if (existingOwner) {
          const existingTenantUser = await tx.tenantUser.findUnique({
            where: {
              tenantId_userId: {
                tenantId: tenant.id,
                userId: existingOwner.id,
              },
            },
          });
          if (existingTenantUser) {
            throw new ConflictException('El owner ya pertenece a esta empresa');
          }
        }

        const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
        const owner = existingOwner
          ? await tx.user.update({
              where: { id: existingOwner.id },
              data: { name: dto.ownerName, status: UserStatus.ACTIVE },
            })
          : await tx.user.create({
              data: {
                name: dto.ownerName,
                email: ownerEmail,
                passwordHash,
                status: UserStatus.ACTIVE,
              },
            });

        await tx.tenantUser.create({
          data: {
            tenantId: tenant.id,
            userId: owner.id,
            role: UserRole.OWNER,
            status: TenantUserStatus.ACTIVE,
            createdBy: actorUserId,
          },
        });

        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            status: TenantSubscriptionStatus.TRIAL,
            startsAt: new Date(),
            trialEndsAt: this.addDays(new Date(), 14),
            notes: 'Alta inicial en periodo de prueba.',
          },
        });

        await tx.platformAuditLog.create({
          data: {
            actorUserId,
            tenantId: tenant.id,
            action: 'tenant.created',
            entityType: 'tenant',
            entityId: tenant.id,
            newValue: this.auditValue(tenant),
          },
        });

        return tenant;
      })
      .then(async (tenant) => {
        try {
          await this.securityService.regenerateAccessLink(
            tenant.id,
            actorUserId,
          );
        } catch {
          // Access link generation is best-effort for the first platform version.
        }

        return this.findTenant(tenant.id);
      });
  }

  async findTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        ...tenantSelect,
        settings: true,
        users: {
          orderBy: { createdAt: 'asc' },
          take: 10,
          select: {
            id: true,
            role: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                lastLoginAt: true,
              },
            },
          },
        },
        subscription: {
          include: {
            plan: {
              select: planSelect,
            },
          },
        },
        modules: {
          include: {
            module: {
              select: moduleSelect,
            },
          },
          orderBy: {
            module: {
              sortOrder: 'asc',
            },
          },
        },
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: tenantContactSelect,
        },
        onboardingTasks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: onboardingTaskSelect,
        },
        emergencyLocks: {
          where: { status: EmergencyLockStatus.ACTIVE },
          orderBy: { activatedAt: 'desc' },
          take: 1,
          select: emergencyLockSelect,
        },
        accountActivities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            tenantId: true,
            actorUserId: true,
            type: true,
            title: true,
            notes: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const metrics = await this.tenantMetrics(id);

    return {
      ...tenant,
      metrics: {
        ...metrics,
        status: tenant.status,
        accessStatus: tenant.accessStatus,
      },
    };
  }

  async updateTenant(
    actorUserId: string,
    id: string,
    dto: UpdatePlatformTenantDto,
  ) {
    const previous = await this.findTenantSnapshot(id);
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: dto,
      select: tenantSelect,
    });

    await this.createAudit(
      actorUserId,
      id,
      'tenant.updated',
      previous,
      updated,
    );

    return this.findTenant(id);
  }

  async updateTenantWorkspace(
    actorUserId: string,
    id: string,
    dto: UpdateTenantWorkspaceDto,
  ) {
    const previous = await this.findTenantSnapshot(id);
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        lifecycleStage: dto.lifecycleStage,
        riskLevel: dto.riskLevel,
        platformNotes: dto.platformNotes,
        lastContactAt: this.resolveDateInput(dto.lastContactAt),
        onboardingStartedAt: this.resolveDateInput(dto.onboardingStartedAt),
        onboardingCompletedAt: this.resolveDateInput(dto.onboardingCompletedAt),
        activatedAt: this.resolveDateInput(dto.activatedAt),
      },
      select: tenantSelect,
    });

    await this.createAudit(
      actorUserId,
      id,
      'tenant.workspace_updated',
      previous,
      updated,
    );

    return this.findTenant(id);
  }

  async updateTenantAccount(
    actorUserId: string,
    id: string,
    dto: UpdateTenantAccountDto,
  ) {
    const previous = await this.findTenantSnapshot(id);

    if (dto.accountOwnerId) {
      await this.prisma.user.findFirstOrThrow({
        where: { id: dto.accountOwnerId, status: { not: UserStatus.DELETED } },
        select: { id: true },
      });
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        accountOwnerId:
          dto.accountOwnerId === undefined ? undefined : dto.accountOwnerId || null,
        accountHealth: dto.accountHealth,
        nextReviewAt: this.resolveDateInput(dto.nextReviewAt),
        platformNotes:
          dto.platformNotes === undefined ? undefined : dto.platformNotes?.trim() || null,
        lastContactAt: this.resolveDateInput(dto.lastContactAt),
      },
      select: tenantSelect,
    });

    await this.createAudit(
      actorUserId,
      id,
      'tenant.account_updated',
      previous,
      updated,
    );

    return this.findTenant(id);
  }

  async updateTenantCollection(
    actorUserId: string,
    id: string,
    dto: UpdateTenantCollectionDto,
  ) {
    await this.findTenantSnapshot(id);

    if (dto.assignedToId) {
      await this.prisma.user.findFirstOrThrow({
        where: { id: dto.assignedToId, status: { not: UserStatus.DELETED } },
        select: { id: true },
      });
    }

    const previous = await this.prisma.tenantCollectionCase.findUnique({
      where: { tenantId: id },
      select: {
        id: true,
        tenantId: true,
        assignedToId: true,
        status: true,
        notes: true,
        openedAt: true,
        lastContactAt: true,
        nextActionAt: true,
        promiseDate: true,
        closedAt: true,
      },
    });

    const status = dto.status;
    const closedAt =
      dto.closedAt !== undefined
        ? this.resolveDateInput(dto.closedAt)
        : status === PlatformCollectionStatus.CLOSED
          ? new Date()
          : status
            ? null
            : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lastContactAt !== undefined) {
        await tx.tenant.update({
          where: { id },
          data: { lastContactAt: this.resolveDateInput(dto.lastContactAt) },
          select: { id: true },
        });
      }

      return tx.tenantCollectionCase.upsert({
        where: { tenantId: id },
        update: {
          assignedToId:
            dto.assignedToId === undefined ? undefined : dto.assignedToId || null,
          status,
          notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
          lastContactAt: this.resolveDateInput(dto.lastContactAt),
          nextActionAt: this.resolveDateInput(dto.nextActionAt),
          promiseDate: this.resolveDateInput(dto.promiseDate),
          closedAt,
        },
        create: {
          tenantId: id,
          assignedToId: dto.assignedToId || null,
          status: status ?? PlatformCollectionStatus.OPEN,
          notes: dto.notes?.trim() || null,
          lastContactAt: this.resolveDateInput(dto.lastContactAt),
          nextActionAt: this.resolveDateInput(dto.nextActionAt),
          promiseDate: this.resolveDateInput(dto.promiseDate),
          closedAt: closedAt instanceof Date ? closedAt : null,
        },
        select: {
          id: true,
          tenantId: true,
          assignedToId: true,
          status: true,
          notes: true,
          openedAt: true,
          lastContactAt: true,
          nextActionAt: true,
          promiseDate: true,
          closedAt: true,
        },
      });
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: id,
        action: 'tenant.collection_updated',
        entityType: 'tenant_collection_case',
        entityId: updated.id,
        oldValue: previous as unknown as Prisma.InputJsonObject | undefined,
        newValue: updated as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(id);
  }

  async createTenantAccountActivity(
    actorUserId: string,
    tenantId: string,
    dto: CreateTenantAccountActivityDto,
  ) {
    await this.findTenantSnapshot(tenantId);

    const created = await this.prisma.$transaction(async (tx) => {
      if (
        dto.type === PlatformAccountActivityType.CONTACT ||
        dto.type === PlatformAccountActivityType.COLLECTION ||
        dto.type === PlatformAccountActivityType.PROMISE ||
        dto.type === PlatformAccountActivityType.PAYMENT
      ) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { lastContactAt: new Date() },
          select: { id: true },
        });
      }

      return tx.tenantAccountActivity.create({
        data: {
          tenantId,
          actorUserId,
          type: dto.type,
          title: dto.title.trim(),
          notes: dto.notes?.trim() || null,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
        select: {
          id: true,
          tenantId: true,
          actorUserId: true,
          type: true,
          title: true,
          notes: true,
          metadata: true,
          createdAt: true,
        },
      });
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.account_activity_created',
        entityType: 'tenant_account_activity',
        entityId: created.id,
        newValue: created as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async createTenantContact(
    actorUserId: string,
    tenantId: string,
    dto: CreateTenantContactDto,
  ) {
    await this.findTenantSnapshot(tenantId);

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.tenantContact.updateMany({
          where: { tenantId },
          data: { isPrimary: false },
        });
      }

      return tx.tenantContact.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          role: dto.role?.trim() || null,
          email: dto.email?.trim() || null,
          phone: dto.phone?.trim() || null,
          isPrimary: dto.isPrimary ?? false,
          notes: dto.notes?.trim() || null,
        },
        select: tenantContactSelect,
      });
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.contact_created',
        entityType: 'tenant_contact',
        entityId: created.id,
        newValue: created as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async updateTenantContact(
    actorUserId: string,
    tenantId: string,
    contactId: string,
    dto: UpdateTenantContactDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const previous = await this.prisma.tenantContact.findFirst({
      where: { id: contactId, tenantId },
      select: tenantContactSelect,
    });

    if (!previous) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.tenantContact.updateMany({
          where: { tenantId },
          data: { isPrimary: false },
        });
      }

      await tx.tenantContact.update({
        where: { id: contactId },
        data: {
          name: dto.name?.trim(),
          role: dto.role === undefined ? undefined : dto.role?.trim() || null,
          email:
            dto.email === undefined ? undefined : dto.email?.trim() || null,
          phone:
            dto.phone === undefined ? undefined : dto.phone?.trim() || null,
          isPrimary: dto.isPrimary,
          notes:
            dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        },
      });
    });

    const updated = await this.prisma.tenantContact.findUniqueOrThrow({
      where: { id: contactId },
      select: tenantContactSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.contact_updated',
        entityType: 'tenant_contact',
        entityId: contactId,
        oldValue: previous as unknown as Prisma.InputJsonObject,
        newValue: updated as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async deleteTenantContact(
    actorUserId: string,
    tenantId: string,
    contactId: string,
  ) {
    await this.findTenantSnapshot(tenantId);
    const previous = await this.prisma.tenantContact.findFirst({
      where: { id: contactId, tenantId },
      select: tenantContactSelect,
    });

    if (!previous) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.prisma.tenantContact.delete({ where: { id: contactId } });
    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.contact_deleted',
        entityType: 'tenant_contact',
        entityId: contactId,
        oldValue: previous as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async createTenantOnboardingTask(
    actorUserId: string,
    tenantId: string,
    dto: CreateTenantOnboardingTaskDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const created = await this.prisma.tenantOnboardingTask.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? OnboardingTaskStatus.PENDING,
        owner: dto.owner?.trim() || null,
        dueAt: this.resolveDateInput(dto.dueAt),
        sortOrder: dto.sortOrder ?? 0,
        completedAt:
          dto.status === OnboardingTaskStatus.COMPLETED ? new Date() : null,
      },
      select: onboardingTaskSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.onboarding_task_created',
        entityType: 'tenant_onboarding_task',
        entityId: created.id,
        newValue: created as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async updateTenantOnboardingTask(
    actorUserId: string,
    tenantId: string,
    taskId: string,
    dto: UpdateTenantOnboardingTaskDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const previous = await this.prisma.tenantOnboardingTask.findFirst({
      where: { id: taskId, tenantId },
      select: onboardingTaskSelect,
    });

    if (!previous) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const status = dto.status ?? previous.status;
    const completedAt =
      dto.completedAt !== undefined
        ? this.resolveDateInput(dto.completedAt)
        : status === OnboardingTaskStatus.COMPLETED
          ? (previous.completedAt ?? new Date())
          : null;

    const updated = await this.prisma.tenantOnboardingTask.update({
      where: { id: taskId },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        status,
        owner: dto.owner === undefined ? undefined : dto.owner?.trim() || null,
        dueAt: this.resolveDateInput(dto.dueAt),
        completedAt,
        sortOrder: dto.sortOrder,
      },
      select: onboardingTaskSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.onboarding_task_updated',
        entityType: 'tenant_onboarding_task',
        entityId: taskId,
        oldValue: previous as unknown as Prisma.InputJsonObject,
        newValue: updated as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async deleteTenantOnboardingTask(
    actorUserId: string,
    tenantId: string,
    taskId: string,
  ) {
    await this.findTenantSnapshot(tenantId);
    const previous = await this.prisma.tenantOnboardingTask.findFirst({
      where: { id: taskId, tenantId },
      select: onboardingTaskSelect,
    });

    if (!previous) {
      throw new NotFoundException('Tarea no encontrada');
    }

    await this.prisma.tenantOnboardingTask.delete({ where: { id: taskId } });
    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.onboarding_task_deleted',
        entityType: 'tenant_onboarding_task',
        entityId: taskId,
        oldValue: previous as unknown as Prisma.InputJsonObject,
      },
    });

    return this.findTenant(tenantId);
  }

  async suspendTenant(actorUserId: string, id: string) {
    const previous = await this.findTenantSnapshot(id);
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.SUSPENDED },
      select: tenantSelect,
    });

    await this.createAudit(
      actorUserId,
      id,
      'tenant.suspended',
      previous,
      updated,
    );
    return this.findTenant(id);
  }

  async reactivateTenant(actorUserId: string, id: string) {
    const previous = await this.findTenantSnapshot(id);
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.ACTIVE },
      select: tenantSelect,
    });

    await this.createAudit(
      actorUserId,
      id,
      'tenant.reactivated',
      previous,
      updated,
    );
    return this.findTenant(id);
  }

  async exportTenantData(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        status: true,
        createdAt: true,
      },
    });
    if (!tenant) throw new NotFoundException('Empresa no encontrada.');

    const [members, products, sales, inventory, users, cashSessions] =
      await Promise.all([
        this.prisma.member.findMany({
          where: { tenantId },
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            status: true,
            memberClass: true,
            phone: true,
            email: true,
            createdAt: true,
          },
        }),
        this.prisma.product.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            sku: true,
            unitType: true,
            price: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.sale.findMany({
          where: { tenantId },
          select: {
            id: true,
            total: true,
            discount: true,
            subtotal: true,
            status: true,
            saleType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        this.prisma.inventory.findMany({
          where: { tenantId },
          select: {
            productId: true,
            currentQuantity: true,
            minimumQuantity: true,
          },
        }),
        this.prisma.tenantUser.findMany({
          where: { tenantId },
          select: {
            userId: true,
            role: true,
            status: true,
            user: { select: { name: true, email: true } },
          },
        }),
        this.prisma.posSession.findMany({
          where: { tenantId },
          select: {
            id: true,
            status: true,
            openingCash: true,
            closingCash: true,
            difference: true,
            openedAt: true,
            closedAt: true,
          },
          orderBy: { openedAt: 'desc' },
          take: 100,
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      tenant,
      summary: {
        members: members.length,
        products: products.length,
        sales: sales.length,
        users: users.length,
      },
      data: { members, products, sales, inventory, users, cashSessions },
    };
  }

  async deleteTenant(actorUserId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, status: true },
    });

    if (!tenant) throw new NotFoundException('Empresa no encontrada.');
    if (tenant.status === TenantStatus.ACTIVE) {
      throw new BadRequestException(
        'No se puede eliminar una empresa activa. Archívala primero.',
      );
    }

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.deleted',
        entityType: 'tenant',
        entityId: tenantId,
        oldValue: { name: tenant.name, status: tenant.status },
      },
    });

    // Cascade delete — Prisma relations with onDelete: Cascade handle this
    await this.prisma.tenant.delete({ where: { id: tenantId } });

    return { ok: true, deleted: tenant.name };
  }

  async archiveTenant(actorUserId: string, id: string) {
    const previous = await this.findTenantSnapshot(id);
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.ARCHIVED },
      select: tenantSelect,
    });

    await this.createAudit(
      actorUserId,
      id,
      'tenant.archived',
      previous,
      updated,
    );
    return this.findTenant(id);
  }

  async activateTenantEmergency(
    actorUserId: string,
    tenantId: string,
    dto: ActivatePlatformEmergencyDto,
  ) {
    await this.findTenantSnapshot(tenantId);

    return this.prisma.$transaction(async (tx) => {
      const activeLock = await tx.emergencyLock.findFirst({
        where: { tenantId, status: EmergencyLockStatus.ACTIVE },
        select: emergencyLockSelect,
      });

      if (activeLock) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { accessStatus: TenantAccessStatus.EMERGENCY_LOCKED },
        });

        await tx.accessLink.updateMany({
          where: { tenantId, status: AccessLinkStatus.ACTIVE },
          data: {
            status: AccessLinkStatus.REVOKED,
            revokedAt: new Date(),
            revokedBy: actorUserId,
          },
        });

        return activeLock;
      }

      await tx.tenant.update({
        where: { id: tenantId },
        data: { accessStatus: TenantAccessStatus.EMERGENCY_LOCKED },
      });

      await tx.accessLink.updateMany({
        where: { tenantId, status: AccessLinkStatus.ACTIVE },
        data: {
          status: AccessLinkStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: actorUserId,
        },
      });

      const lock = await tx.emergencyLock.create({
        data: {
          tenantId,
          status: EmergencyLockStatus.ACTIVE,
          reason: dto.reason?.trim() || undefined,
          activatedById: actorUserId,
        },
        select: emergencyLockSelect,
      });

      await tx.platformAuditLog.create({
        data: {
          actorUserId,
          tenantId,
          action: 'tenant.emergency_activated',
          entityType: 'emergency_lock',
          entityId: lock.id,
          newValue: {
            status: lock.status,
            reason: lock.reason,
            accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'emergency.activated',
          entityType: 'emergency_lock',
          entityId: lock.id,
          newValue: {
            status: lock.status,
            reason: lock.reason,
            accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
          },
        },
      });

      return lock;
    });
  }

  async deactivateTenantEmergency(
    actorUserId: string,
    tenantId: string,
    dto: ResolvePlatformEmergencyDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const reason = dto.reason.trim();

    return this.prisma.$transaction(async (tx) => {
      const activeLock = await tx.emergencyLock.findFirst({
        where: { tenantId, status: EmergencyLockStatus.ACTIVE },
        select: {
          id: true,
          status: true,
          reason: true,
          activatedAt: true,
        },
      });

      if (!activeLock) {
        throw new NotFoundException('No hay modo emergencia activo');
      }

      await tx.tenant.update({
        where: { id: tenantId },
        data: { accessStatus: TenantAccessStatus.ENABLED },
      });

      await tx.emergencyLock.updateMany({
        where: { tenantId, status: EmergencyLockStatus.ACTIVE },
        data: {
          status: EmergencyLockStatus.RESOLVED,
          deactivatedById: actorUserId,
          deactivatedAt: new Date(),
          resolutionReason: reason,
        },
      });

      const lock = await tx.emergencyLock.findUniqueOrThrow({
        where: { id: activeLock.id },
        select: emergencyLockSelect,
      });

      await tx.platformAuditLog.create({
        data: {
          actorUserId,
          tenantId,
          action: 'tenant.emergency_deactivated',
          entityType: 'emergency_lock',
          entityId: lock.id,
          oldValue: {
            status: activeLock.status,
            reason: activeLock.reason,
            activatedAt: activeLock.activatedAt.toISOString(),
            accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
          },
          newValue: {
            status: lock.status,
            resolutionReason: lock.resolutionReason,
            deactivatedAt: lock.deactivatedAt?.toISOString() ?? null,
            accessStatus: TenantAccessStatus.ENABLED,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'emergency.deactivated_by_platform',
          entityType: 'emergency_lock',
          entityId: lock.id,
          oldValue: {
            status: activeLock.status,
            accessStatus: TenantAccessStatus.EMERGENCY_LOCKED,
          },
          newValue: {
            status: lock.status,
            resolutionReason: lock.resolutionReason,
            accessStatus: TenantAccessStatus.ENABLED,
          },
        },
      });

      return lock;
    });
  }

  async assignTenantPlan(
    actorUserId: string,
    id: string,
    dto: AssignTenantPlanDto,
  ) {
    await this.findTenantSnapshot(id);
    const previous = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: id },
      select: subscriptionSelect,
    });

    if (dto.planId) {
      await this.findPlanSnapshot(dto.planId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.upsert({
        where: { tenantId: id },
        update: {
          planId: dto.planId ?? null,
          status:
            previous?.status === TenantSubscriptionStatus.TRIAL
              ? TenantSubscriptionStatus.TRIAL
              : TenantSubscriptionStatus.ACTIVE,
          endsAt: null,
          cancelledAt: null,
          suspendedAt: null,
          nextRenewalAt:
            previous?.nextRenewalAt ??
            this.addMonths(previous?.startsAt ?? new Date(), 1),
        },
        create: {
          tenantId: id,
          planId: dto.planId ?? null,
          status: TenantSubscriptionStatus.ACTIVE,
          startsAt: new Date(),
          nextRenewalAt: this.addMonths(new Date(), 1),
        },
        select: subscriptionSelect,
      });

      await tx.tenant.update({
        where: { id },
        data: { status: this.tenantStatusForSubscription(subscription.status) },
      });

      return subscription;
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: id,
        action: 'tenant.plan_updated',
        entityType: 'tenant_subscription',
        entityId: updated.id,
        oldValue: previous as Prisma.InputJsonValue,
        newValue: updated,
      },
    });

    if (dto.planId) {
      await this.syncTenantModulesFromPlan(actorUserId, id, dto.planId);
    }

    return this.findTenant(id);
  }

  async updateTenantSubscription(
    actorUserId: string,
    id: string,
    dto: UpdateTenantSubscriptionDto,
  ) {
    await this.findTenantSnapshot(id);
    const previous = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: id },
      select: subscriptionSelect,
    });
    const nextStatus =
      dto.status ?? previous?.status ?? TenantSubscriptionStatus.ACTIVE;
    const startsAt = this.resolveDateInput(dto.startsAt);
    const nextRenewalAt = this.resolveDateInput(dto.nextRenewalAt);
    const trialEndsAt = this.resolveDateInput(dto.trialEndsAt);
    const endsAt = this.resolveDateInput(dto.endsAt);
    const suspendedAt = this.resolveDateInput(dto.suspendedAt);
    const cancelledAt = this.resolveDateInput(dto.cancelledAt);

    const updated = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.upsert({
        where: { tenantId: id },
        update: {
          status: nextStatus,
          startsAt:
            startsAt === undefined
              ? undefined
              : (startsAt ?? previous?.startsAt ?? new Date()),
          nextRenewalAt:
            nextRenewalAt === undefined
              ? this.defaultNextRenewalValue(
                  nextStatus,
                  previous?.nextRenewalAt,
                  previous?.startsAt,
                )
              : nextRenewalAt,
          trialEndsAt:
            trialEndsAt === undefined
              ? nextStatus === TenantSubscriptionStatus.TRIAL &&
                !previous?.trialEndsAt
                ? this.addDays(new Date(), 14)
                : undefined
              : trialEndsAt,
          endsAt:
            endsAt === undefined
              ? nextStatus === TenantSubscriptionStatus.CANCELLED
                ? (previous?.endsAt ?? new Date())
                : nextStatus === TenantSubscriptionStatus.ACTIVE ||
                    nextStatus === TenantSubscriptionStatus.TRIAL
                  ? null
                  : undefined
              : endsAt,
          suspendedAt:
            suspendedAt === undefined
              ? nextStatus === TenantSubscriptionStatus.SUSPENDED
                ? (previous?.suspendedAt ?? new Date())
                : nextStatus === TenantSubscriptionStatus.ACTIVE ||
                    nextStatus === TenantSubscriptionStatus.TRIAL ||
                    nextStatus === TenantSubscriptionStatus.PAST_DUE
                  ? null
                  : undefined
              : suspendedAt,
          cancelledAt:
            cancelledAt === undefined
              ? nextStatus === TenantSubscriptionStatus.CANCELLED
                ? (previous?.cancelledAt ?? new Date())
                : nextStatus === TenantSubscriptionStatus.ACTIVE ||
                    nextStatus === TenantSubscriptionStatus.TRIAL ||
                    nextStatus === TenantSubscriptionStatus.PAST_DUE
                  ? null
                  : undefined
              : cancelledAt,
          notes:
            dto.notes === undefined
              ? undefined
              : dto.notes?.trim()
                ? dto.notes.trim()
                : null,
        },
        create: {
          tenantId: id,
          status: nextStatus,
          startsAt: startsAt ?? new Date(),
          nextRenewalAt:
            nextRenewalAt === undefined
              ? this.defaultNextRenewalValue(
                  nextStatus,
                  null,
                  startsAt ?? new Date(),
                )
              : nextRenewalAt,
          trialEndsAt:
            trialEndsAt === undefined &&
            nextStatus === TenantSubscriptionStatus.TRIAL
              ? this.addDays(new Date(), 14)
              : trialEndsAt,
          endsAt:
            endsAt === undefined &&
            nextStatus === TenantSubscriptionStatus.CANCELLED
              ? new Date()
              : endsAt,
          suspendedAt:
            suspendedAt === undefined &&
            nextStatus === TenantSubscriptionStatus.SUSPENDED
              ? new Date()
              : suspendedAt,
          cancelledAt:
            cancelledAt === undefined &&
            nextStatus === TenantSubscriptionStatus.CANCELLED
              ? new Date()
              : cancelledAt,
          notes: dto.notes?.trim() || undefined,
        },
        select: subscriptionSelect,
      });

      await tx.tenant.update({
        where: { id },
        data: { status: this.tenantStatusForSubscription(subscription.status) },
      });

      return subscription;
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: id,
        action: 'tenant.subscription_updated',
        entityType: 'tenant_subscription',
        entityId: updated.id,
        oldValue: previous as Prisma.InputJsonValue,
        newValue: updated,
      },
    });

    return this.findTenant(id);
  }

  async renewTenantSubscription(
    actorUserId: string,
    tenantId: string,
    dto: RenewTenantSubscriptionDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const previous = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: subscriptionSelect,
    });

    const months = dto.months ?? 1;
    const currency = dto.currency ?? 'EUR';
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const renewalAnchor =
      previous?.nextRenewalAt && previous.nextRenewalAt > paidAt
        ? previous.nextRenewalAt
        : paidAt;
    const nextRenewalAt = this.addMonths(renewalAnchor, months);
    const description =
      dto.description?.trim() ||
      this.defaultRenewalDescription(previous?.plan?.name, months);

    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.platformInvoice.create({
        data: {
          tenantId,
          number: await this.nextInvoiceNumber(),
          amount: dto.amount,
          currency,
          description,
          status: dto.markAsPaid ? 'PAID' : 'ISSUED',
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          paidAt: dto.markAsPaid ? paidAt : null,
        },
        select: invoiceSelect,
      });

      const payment = dto.markAsPaid
        ? await tx.platformPayment.create({
            data: {
              tenantId,
              invoiceId: invoice.id,
              amount: dto.amount,
              currency,
              method: dto.method?.trim() || 'manual',
              reference: dto.reference?.trim() || undefined,
              paidAt,
            },
            select: paymentSelect,
          })
        : null;

      const shouldActivateSubscription =
        dto.markAsPaid ||
        !previous ||
        previous.status === TenantSubscriptionStatus.ACTIVE;

      const subscription = shouldActivateSubscription
        ? await tx.tenantSubscription.upsert({
            where: { tenantId },
            update: {
              status: TenantSubscriptionStatus.ACTIVE,
              startsAt: previous?.startsAt ?? paidAt,
              nextRenewalAt,
              trialEndsAt: null,
              endsAt: null,
              suspendedAt: null,
              cancelledAt: null,
              notes: this.mergeSubscriptionNotes(previous?.notes, dto.notes),
            },
            create: {
              tenantId,
              planId: previous?.planId ?? null,
              status: TenantSubscriptionStatus.ACTIVE,
              startsAt: paidAt,
              nextRenewalAt,
              notes: dto.notes?.trim() || undefined,
            },
            select: subscriptionSelect,
          })
        : previous;

      if (shouldActivateSubscription) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { status: TenantStatus.ACTIVE },
        });
      }

      return {
        invoice,
        payment,
        subscription,
        nextRenewalAt,
      };
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.subscription_renewed_manually',
        entityType: 'tenant_subscription',
        entityId: result.subscription?.id ?? previous?.id ?? tenantId,
        oldValue: previous as Prisma.InputJsonValue,
        newValue: {
          invoiceId: result.invoice.id,
          paymentId: result.payment?.id ?? null,
          nextRenewalAt: result.nextRenewalAt.toISOString(),
          markAsPaid: Boolean(dto.markAsPaid),
          months,
          amount: String(dto.amount),
          currency,
          notes: dto.notes?.trim() || null,
        },
      },
    });

    return result;
  }

  async updateTenantModules(
    actorUserId: string,
    id: string,
    dto: UpdateTenantModulesDto,
  ) {
    await this.findTenantSnapshot(id);
    const modules = await this.findModules();
    const validModuleIds = new Set(modules.map((module) => module.id));
    const previous = await this.prisma.tenantModule.findMany({
      where: { tenantId: id },
      include: { module: { select: moduleSelect } },
    });

    for (const setting of dto.modules) {
      if (!validModuleIds.has(setting.moduleId)) {
        throw new NotFoundException('Módulo no encontrado');
      }

      await this.prisma.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: id,
            moduleId: setting.moduleId,
          },
        },
        update: {
          status: setting.enabled ? 'ENABLED' : 'DISABLED',
          enabledAt: setting.enabled ? new Date() : undefined,
          disabledAt: setting.enabled ? null : new Date(),
        },
        create: {
          tenantId: id,
          moduleId: setting.moduleId,
          status: setting.enabled ? 'ENABLED' : 'DISABLED',
          enabledAt: setting.enabled ? new Date() : undefined,
          disabledAt: setting.enabled ? null : new Date(),
        },
      });
    }

    const updated = await this.prisma.tenantModule.findMany({
      where: { tenantId: id },
      include: { module: { select: moduleSelect } },
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: id,
        action: 'tenant.modules_updated',
        entityType: 'tenant_modules',
        entityId: id,
        oldValue: this.modulesAuditValue(previous),
        newValue: this.modulesAuditValue(updated),
      },
    });

    return this.findTenant(id);
  }

  findAudit(query: PlatformAuditQueryDto = {}) {
    const where: Prisma.PlatformAuditLogWhereInput = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.action) where.action = query.action;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      };
    }

    return this.prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.take ?? 100,
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, status: true } },
      },
    });
  }

  findSupportSessions(tenantId?: string) {
    return this.prisma.platformSupportSession.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { openedAt: 'desc' },
      take: 100,
      select: supportSessionSelect,
    });
  }

  async openSupportSession(
    actorUserId: string,
    tenantId: string,
    dto: OpenSupportSessionDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const existingOpen = await this.prisma.platformSupportSession.findFirst({
      where: { tenantId, status: 'OPEN' },
      select: supportSessionSelect,
    });

    if (existingOpen) {
      return existingOpen;
    }

    const session = await this.prisma.platformSupportSession.create({
      data: {
        tenantId,
        openedById: actorUserId,
        reason: dto.reason.trim(),
        notes: dto.notes?.trim() || undefined,
      },
      select: supportSessionSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'support.session_opened',
        entityType: 'platform_support_session',
        entityId: session.id,
        newValue: this.supportSessionAuditValue(session),
      },
    });

    return session;
  }

  async closeSupportSession(
    actorUserId: string,
    id: string,
    dto: CloseSupportSessionDto,
  ) {
    const previous = await this.prisma.platformSupportSession.findUnique({
      where: { id },
      select: supportSessionSelect,
    });

    if (!previous) {
      throw new NotFoundException('Sesión de soporte no encontrada');
    }

    if (previous.status === 'CLOSED') {
      return previous;
    }

    const session = await this.prisma.platformSupportSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedById: actorUserId,
        closedAt: new Date(),
        notes: dto.notes?.trim() || previous.notes,
      },
      select: supportSessionSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: session.tenantId,
        action: 'support.session_closed',
        entityType: 'platform_support_session',
        entityId: session.id,
        oldValue: this.supportSessionAuditValue(previous),
        newValue: this.supportSessionAuditValue(session),
      },
    });

    return session;
  }

  async impersonateSupportSession(actorUserId: string, id: string) {
    const session = await this.prisma.platformSupportSession.findUnique({
      where: { id },
      select: supportSessionSelect,
    });

    if (!session) {
      throw new NotFoundException('Sesión de soporte no encontrada');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('La sesión de soporte no está abierta');
    }

    const [permissions, enabledModules] = await Promise.all([
      this.getPermissionsForRole(UserRole.OWNER),
      this.getEnabledModulesForTenant(session.tenantId),
    ]);

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, name: true, email: true },
    });

    const payload = {
      sub: actorUserId,
      email: actor?.email,
      name: `${actor?.name ?? 'Soporte'} (soporte)`,
      tenantId: session.tenantId,
      tenantUserId: session.id,
      role: UserRole.OWNER,
      permissions,
      supportSessionId: session.id,
      impersonatedByUserId: actorUserId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: session.tenantId,
        action: 'support.impersonation_started',
        entityType: 'platform_support_session',
        entityId: session.id,
        newValue: this.supportSessionAuditValue(session),
      },
    });

    return {
      accessToken,
      user: {
        id: actorUserId,
        name: payload.name,
        email: actor?.email ?? '',
        role: UserRole.OWNER,
      },
      tenant: {
        id: session.tenant.id,
        name: session.tenant.name,
        accessStatus: 'ENABLED',
        enabledModules,
      },
      permissions,
      impersonation: {
        supportSessionId: session.id,
        actorUserId,
        actorName: actor?.name ?? 'Soporte',
        tenantName: session.tenant.name,
      },
    };
  }

  async findInvoiceById(id: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxId: true,
            email: true,
            phone: true,
            city: true,
            country: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            reference: true,
            paidAt: true,
            status: true,
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada.');
    return invoice;
  }

  findInvoices(query: PlatformBillingQueryDto = {}) {
    const { q, tenantId, invoiceStatus, dateFrom, dateTo } = query;
    const search = q?.trim();
    const where: Prisma.PlatformInvoiceWhereInput = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (invoiceStatus) {
      where.status = invoiceStatus as Prisma.EnumPlatformInvoiceStatusFilter;
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tenant: { is: { name: { contains: search, mode: 'insensitive' } } } },
        {
          tenant: {
            is: { legalName: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          tenant: { is: { email: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }

    if (dateFrom || dateTo) {
      where.issuedAt = {};

      if (dateFrom) {
        where.issuedAt.gte = new Date(dateFrom);
      }

      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.issuedAt.lte = endOfDay;
      }
    }

    return this.prisma.platformInvoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      take: query.take ?? 100,
      select: invoiceSelect,
    });
  }

  findPayments(query: PlatformBillingQueryDto = {}) {
    const { q, tenantId, paymentStatus, dateFrom, dateTo } = query;
    const search = q?.trim();
    const where: Prisma.PlatformPaymentWhereInput = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (paymentStatus) {
      where.status = paymentStatus as Prisma.EnumPlatformPaymentStatusFilter;
    }

    if (search) {
      where.OR = [
        { method: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { tenant: { is: { name: { contains: search, mode: 'insensitive' } } } },
        {
          tenant: {
            is: { legalName: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          tenant: { is: { email: { contains: search, mode: 'insensitive' } } },
        },
        {
          invoice: {
            is: { number: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    if (dateFrom || dateTo) {
      where.paidAt = {};

      if (dateFrom) {
        where.paidAt.gte = new Date(dateFrom);
      }

      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.paidAt.lte = endOfDay;
      }
    }

    return this.prisma.platformPayment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      take: query.take ?? 100,
      select: paymentSelect,
    });
  }

  async createInvoice(
    actorUserId: string,
    tenantId: string,
    dto: CreatePlatformInvoiceDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const invoice = await this.prisma.platformInvoice.create({
      data: {
        tenantId,
        number: await this.nextInvoiceNumber(),
        amount: dto.amount,
        currency: dto.currency ?? 'EUR',
        description: dto.description?.trim() || undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      select: invoiceSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'billing.invoice_created',
        entityType: 'platform_invoice',
        entityId: invoice.id,
        newValue: this.invoiceAuditValue(invoice),
      },
    });

    return invoice;
  }

  async updateInvoice(
    actorUserId: string,
    id: string,
    dto: UpdatePlatformInvoiceDto,
  ) {
    const previous = await this.prisma.platformInvoice.findUnique({
      where: { id },
      select: invoiceSelect,
    });
    if (!previous) throw new NotFoundException('Factura no encontrada');

    const updated = await this.prisma.platformInvoice.update({
      where: { id },
      data: {
        status: dto.status,
        description: dto.description,
        dueAt:
          dto.dueAt === undefined
            ? undefined
            : dto.dueAt
              ? new Date(dto.dueAt)
              : null,
        paidAt: dto.status === 'PAID' ? new Date() : undefined,
        voidedAt: dto.status === 'VOID' ? new Date() : undefined,
      },
      select: invoiceSelect,
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId: updated.tenantId,
        action: 'billing.invoice_updated',
        entityType: 'platform_invoice',
        entityId: updated.id,
        oldValue: this.invoiceAuditValue(previous),
        newValue: this.invoiceAuditValue(updated),
      },
    });

    return updated;
  }

  async createPayment(
    actorUserId: string,
    tenantId: string,
    dto: CreatePlatformPaymentDto,
  ) {
    await this.findTenantSnapshot(tenantId);
    const invoice = dto.invoiceId
      ? await this.prisma.platformInvoice.findUnique({
          where: { id: dto.invoiceId },
          select: { id: true, tenantId: true },
        })
      : null;

    if (dto.invoiceId && (!invoice || invoice.tenantId !== tenantId)) {
      throw new NotFoundException('Factura no encontrada para esta empresa');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.platformPayment.create({
        data: {
          tenantId,
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          currency: dto.currency ?? 'EUR',
          method: dto.method?.trim() || undefined,
          reference: dto.reference?.trim() || undefined,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        },
        select: paymentSelect,
      });

      if (dto.invoiceId) {
        await tx.platformInvoice.update({
          where: { id: dto.invoiceId },
          data: { status: 'PAID', paidAt: created.paidAt },
        });
      }

      if (dto.reactivateSubscription) {
        await tx.tenantSubscription.upsert({
          where: { tenantId },
          update: {
            status: TenantSubscriptionStatus.ACTIVE,
            nextRenewalAt: dto.nextRenewalAt
              ? new Date(dto.nextRenewalAt)
              : undefined,
            suspendedAt: null,
            cancelledAt: null,
            endsAt: null,
          },
          create: {
            tenantId,
            status: TenantSubscriptionStatus.ACTIVE,
            startsAt: created.paidAt,
            nextRenewalAt: dto.nextRenewalAt
              ? new Date(dto.nextRenewalAt)
              : this.addMonths(created.paidAt, 1),
          },
        });

        await tx.tenant.update({
          where: { id: tenantId },
          data: { status: TenantStatus.ACTIVE },
        });
      }

      return created;
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'billing.payment_recorded',
        entityType: 'platform_payment',
        entityId: payment.id,
        newValue: this.paymentAuditValue(payment),
      },
    });

    return payment;
  }

  private async findTenantSnapshot(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: tenantSelect,
    });

    if (!tenant) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return tenant;
  }

  private async findPlanSnapshot(id: string) {
    const plan = await this.prisma.platformPlan.findUnique({
      where: { id },
      select: planSelect,
    });

    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    return plan;
  }

  private async syncTenantModulesFromPlan(
    actorUserId: string,
    tenantId: string,
    planId: string,
  ) {
    const [definitions, planModules, previous] = await Promise.all([
      this.prisma.platformModuleDefinition.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      }),
      this.prisma.platformPlanModule.findMany({
        where: { planId },
        select: { moduleId: true },
      }),
      this.prisma.tenantModule.findMany({
        where: { tenantId },
        include: { module: { select: moduleSelect } },
      }),
    ]);

    const includedModuleIds = new Set(
      planModules.map((module) => module.moduleId),
    );
    const now = new Date();

    await this.prisma.$transaction(
      definitions.map((definition) => {
        const enabled = includedModuleIds.has(definition.id);
        return this.prisma.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId,
              moduleId: definition.id,
            },
          },
          update: {
            status: enabled ? 'ENABLED' : 'DISABLED',
            enabledAt: enabled ? now : undefined,
            disabledAt: enabled ? null : now,
          },
          create: {
            tenantId,
            moduleId: definition.id,
            status: enabled ? 'ENABLED' : 'DISABLED',
            enabledAt: enabled ? now : undefined,
            disabledAt: enabled ? null : now,
          },
        });
      }),
    );

    const updated = await this.prisma.tenantModule.findMany({
      where: { tenantId },
      include: { module: { select: moduleSelect } },
    });

    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'tenant.modules_synced_from_plan',
        entityType: 'tenant_modules',
        entityId: tenantId,
        oldValue: this.modulesAuditValue(previous),
        newValue: this.modulesAuditValue(updated),
      },
    });
  }

  private async findModuleSnapshot(id: string) {
    const module = await this.prisma.platformModuleDefinition.findUnique({
      where: { id },
      select: moduleSelect,
    });

    if (!module) {
      throw new NotFoundException('Módulo no encontrado');
    }

    return module;
  }

  private async withTenantMetrics(tenant: TenantSnapshot) {
    const [metrics, subscription] = await Promise.all([
      this.tenantMetrics(tenant.id),
      this.prisma.tenantSubscription.findUnique({
        where: { tenantId: tenant.id },
        include: { plan: { select: planSelect } },
      }),
    ]);

    return {
      ...tenant,
      subscription,
      usersCount: metrics.usersCount,
      membersCount: metrics.membersCount,
      salesCount: metrics.salesCount,
      openCashSessions: metrics.openCashSessions,
      lastActivityAt: metrics.lastActivityAt,
    };
  }

  private async withTenantMetricsBatch(tenants: TenantSnapshot[]) {
    if (!tenants.length) {
      return [];
    }

    const tenantIds = tenants.map((tenant) => tenant.id);
    const [
      subscriptions,
      usersCounts,
      membersCounts,
      salesCounts,
      openCashSessionsCounts,
      lastSales,
      lastCashMovements,
      lastInventoryMovements,
    ] = await Promise.all([
      this.prisma.tenantSubscription.findMany({
        where: {
          tenantId: { in: tenantIds },
        },
        include: {
          plan: { select: planSelect },
        },
      }),
      this.prisma.tenantUser.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
        },
        _count: { _all: true },
      }),
      this.prisma.member.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
          status: { not: 'DELETED' },
        },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
        },
        _count: { _all: true },
      }),
      this.prisma.posSession.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
          status: 'OPEN',
        },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
        },
        _max: { createdAt: true },
      }),
      this.prisma.cashMovement.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
        },
        _max: { createdAt: true },
      }),
      this.prisma.inventoryMovement.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
        },
        _max: { createdAt: true },
      }),
    ]);

    const subscriptionsByTenantId = new Map(
      subscriptions.map((subscription) => [
        subscription.tenantId,
        subscription,
      ]),
    );
    const usersCountByTenantId = new Map(
      usersCounts.map((row) => [row.tenantId, row._count._all]),
    );
    const membersCountByTenantId = new Map(
      membersCounts.map((row) => [row.tenantId, row._count._all]),
    );
    const salesCountByTenantId = new Map(
      salesCounts.map((row) => [row.tenantId, row._count._all]),
    );
    const openCashSessionsByTenantId = new Map(
      openCashSessionsCounts.map((row) => [row.tenantId, row._count._all]),
    );
    const lastSaleByTenantId = new Map(
      lastSales.map((row) => [row.tenantId, row._max.createdAt ?? null]),
    );
    const lastCashMovementByTenantId = new Map(
      lastCashMovements.map((row) => [
        row.tenantId,
        row._max.createdAt ?? null,
      ]),
    );
    const lastInventoryMovementByTenantId = new Map(
      lastInventoryMovements.map((row) => [
        row.tenantId,
        row._max.createdAt ?? null,
      ]),
    );

    return tenants.map((tenant) => {
      const lastActivityAt =
        [
          lastSaleByTenantId.get(tenant.id) ?? null,
          lastCashMovementByTenantId.get(tenant.id) ?? null,
          lastInventoryMovementByTenantId.get(tenant.id) ?? null,
        ]
          .filter(Boolean)
          .sort((a, b) => Number(b) - Number(a))[0] ?? null;

      return {
        ...tenant,
        subscription: subscriptionsByTenantId.get(tenant.id) ?? null,
        usersCount: usersCountByTenantId.get(tenant.id) ?? 0,
        membersCount: membersCountByTenantId.get(tenant.id) ?? 0,
        salesCount: salesCountByTenantId.get(tenant.id) ?? 0,
        openCashSessions: openCashSessionsByTenantId.get(tenant.id) ?? 0,
        lastActivityAt,
      };
    });
  }

  private async tenantMetrics(tenantId: string) {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const [
      usersCount,
      membersCount,
      productsCount,
      salesCount,
      salesThisMonth,
      openCashSessions,
      receivablesOutstanding,
      lastSale,
      lastCashMovement,
      lastInventoryMovement,
    ] = await Promise.all([
      this.prisma.tenantUser.count({ where: { tenantId } }),
      this.prisma.member.count({
        where: { tenantId, status: { not: 'DELETED' } },
      }),
      this.prisma.product.count({
        where: { tenantId, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.sale.count({ where: { tenantId } }),
      this.prisma.sale.aggregate({
        where: { tenantId, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      this.prisma.posSession.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.receivable.aggregate({
        where: {
          tenantId,
          status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { outstandingAmount: true },
      }),
      this.prisma.sale.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.cashMovement.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.inventoryMovement.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const lastActivityAt =
      [
        lastSale?.createdAt,
        lastCashMovement?.createdAt,
        lastInventoryMovement?.createdAt,
      ]
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a))[0] ?? null;

    return {
      usersCount,
      membersCount,
      productsCount,
      salesCount,
      salesThisMonth: Number(salesThisMonth._sum.total ?? 0),
      openCashSessions,
      receivablesOutstanding: Number(
        receivablesOutstanding._sum.outstandingAmount ?? 0,
      ),
      lastActivityAt,
    };
  }

  private emptyBillingSnapshot() {
    return {
      openInvoicesCount: 0,
      overdueInvoicesCount: 0,
      overdueAmount: 0,
      lastInvoiceDueAt: null,
      lastPaymentAt: null,
      totalPaid: 0,
    };
  }

  private async billingSnapshotByTenantIds(tenantIds: string[]) {
    const uniqueTenantIds = [...new Set(tenantIds.filter(Boolean))];
    const result = new Map<
      string,
      {
        openInvoicesCount: number;
        overdueInvoicesCount: number;
        overdueAmount: number;
        lastInvoiceDueAt: Date | null;
        lastPaymentAt: Date | null;
        totalPaid: number;
      }
    >();

    if (!uniqueTenantIds.length) {
      return result;
    }

    const now = new Date();
    const [invoices, payments] = await Promise.all([
      this.prisma.platformInvoice.findMany({
        where: {
          tenantId: { in: uniqueTenantIds },
          status: { in: ['ISSUED', 'PAID'] },
        },
        select: {
          tenantId: true,
          amount: true,
          status: true,
          dueAt: true,
          paidAt: true,
        },
      }),
      this.prisma.platformPayment.findMany({
        where: { tenantId: { in: uniqueTenantIds } },
        select: {
          tenantId: true,
          amount: true,
          paidAt: true,
        },
      }),
    ]);

    for (const invoice of invoices) {
      const current = result.get(invoice.tenantId) ?? this.emptyBillingSnapshot();
      if (invoice.status === 'ISSUED') {
        current.openInvoicesCount += 1;
        if (invoice.dueAt && invoice.dueAt < now) {
          current.overdueInvoicesCount += 1;
          current.overdueAmount += Number(invoice.amount);
        }
      }
      if (
        invoice.dueAt &&
        (!current.lastInvoiceDueAt || invoice.dueAt > current.lastInvoiceDueAt)
      ) {
        current.lastInvoiceDueAt = invoice.dueAt;
      }
      result.set(invoice.tenantId, current);
    }

    for (const payment of payments) {
      const current = result.get(payment.tenantId) ?? this.emptyBillingSnapshot();
      current.totalPaid += Number(payment.amount);
      if (!current.lastPaymentAt || payment.paidAt > current.lastPaymentAt) {
        current.lastPaymentAt = payment.paidAt;
      }
      result.set(payment.tenantId, current);
    }

    return result;
  }

  private async createAudit(
    actorUserId: string,
    tenantId: string,
    action: string,
    oldValue: TenantSnapshot,
    newValue: TenantSnapshot,
  ) {
    await this.prisma.platformAuditLog.create({
      data: {
        actorUserId,
        tenantId,
        action,
        entityType: 'tenant',
        entityId: tenantId,
        oldValue: this.auditValue(oldValue),
        newValue: this.auditValue(newValue),
      },
    });
  }

  private auditValue(tenant: TenantSnapshot): Prisma.InputJsonObject {
    return {
      id: tenant.id,
      name: tenant.name,
      legalName: tenant.legalName,
      taxId: tenant.taxId,
      email: tenant.email,
      phone: tenant.phone,
      city: tenant.city,
      country: tenant.country,
      status: tenant.status,
      accessStatus: tenant.accessStatus,
    };
  }

  private planAuditValue(
    plan: Prisma.PlatformPlanGetPayload<{ select: typeof planSelect }>,
  ): Prisma.InputJsonObject {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceMonthly: String(plan.priceMonthly),
      currency: plan.currency,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      features: plan.features,
      status: plan.status,
    };
  }

  private moduleAuditValue(
    module: Prisma.PlatformModuleDefinitionGetPayload<{
      select: typeof moduleSelect;
    }>,
  ): Prisma.InputJsonObject {
    return {
      id: module.id,
      key: module.key,
      name: module.name,
      description: module.description,
      category: module.category,
      sortOrder: module.sortOrder,
      status: module.status,
    };
  }

  private planModulesAuditValue(
    modules: Array<
      Prisma.PlatformPlanModuleGetPayload<{
        include: { module: { select: typeof moduleSelect } };
      }>
    >,
  ): Prisma.InputJsonArray {
    return modules.map((planModule) => ({
      moduleId: planModule.moduleId,
      key: planModule.module.key,
      name: planModule.module.name,
    }));
  }

  private modulesAuditValue(
    modules: Array<
      Prisma.TenantModuleGetPayload<{
        include: { module: { select: typeof moduleSelect } };
      }>
    >,
  ): Prisma.InputJsonArray {
    return modules.map((tenantModule) => ({
      moduleId: tenantModule.moduleId,
      key: tenantModule.module.key,
      name: tenantModule.module.name,
      status: tenantModule.status,
    }));
  }

  private supportSessionAuditValue(
    session: Prisma.PlatformSupportSessionGetPayload<{
      select: typeof supportSessionSelect;
    }>,
  ): Prisma.InputJsonObject {
    return {
      id: session.id,
      tenantId: session.tenantId,
      reason: session.reason,
      status: session.status,
      notes: session.notes,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      openedById: session.openedById,
      closedById: session.closedById,
    };
  }

  private async getPermissionsForRole(role: UserRole) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return rolePermissions.map((item) => item.permission.key);
  }

  private async getEnabledModulesForTenant(tenantId: string) {
    const [definitions, tenantModules] = await Promise.all([
      this.prisma.platformModuleDefinition.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, key: true },
      }),
      this.prisma.tenantModule.findMany({
        where: { tenantId },
        select: { moduleId: true, status: true },
      }),
    ]);

    const configured = new Map(
      tenantModules.map((module) => [module.moduleId, module.status]),
    );

    return definitions
      .filter((definition) => configured.get(definition.id) !== 'DISABLED')
      .map((definition) => definition.key);
  }

  private resolveDateInput(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    return value ? new Date(value) : null;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private defaultRenewalDescription(planName?: string | null, months = 1) {
    const label = months === 1 ? '1 mes' : `${months} meses`;
    return planName
      ? `Renovacion manual ${planName} · ${label}`
      : `Renovacion manual SaaS · ${label}`;
  }

  private mergeSubscriptionNotes(
    currentNotes?: string | null,
    nextNote?: string | null,
  ) {
    const cleaned = nextNote?.trim();
    if (!cleaned) return currentNotes ?? null;
    if (!currentNotes?.trim()) return cleaned;
    return `${currentNotes.trim()}\n${cleaned}`;
  }

  private defaultNextRenewalValue(
    status: TenantSubscriptionStatus,
    currentValue?: Date | null,
    startsAt?: Date | null,
  ) {
    if (
      status === TenantSubscriptionStatus.CANCELLED ||
      status === TenantSubscriptionStatus.TRIAL
    ) {
      return null;
    }

    if (currentValue) {
      return currentValue;
    }

    return this.addMonths(startsAt ?? new Date(), 1);
  }

  private tenantStatusForSubscription(status: TenantSubscriptionStatus) {
    switch (status) {
      case TenantSubscriptionStatus.SUSPENDED:
        return TenantStatus.SUSPENDED;
      case TenantSubscriptionStatus.CANCELLED:
        return TenantStatus.DISABLED;
      case TenantSubscriptionStatus.TRIAL:
      case TenantSubscriptionStatus.ACTIVE:
      case TenantSubscriptionStatus.PAST_DUE:
      default:
        return TenantStatus.ACTIVE;
    }
  }

  private async nextInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.platformInvoice.count({
      where: {
        issuedAt: {
          gte: new Date(year, 0, 1),
        },
      },
    });

    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private invoiceAuditValue(
    invoice: Prisma.PlatformInvoiceGetPayload<{ select: typeof invoiceSelect }>,
  ): Prisma.InputJsonObject {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      number: invoice.number,
      description: invoice.description,
      amount: String(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      voidedAt: invoice.voidedAt?.toISOString() ?? null,
    };
  }

  private paymentAuditValue(
    payment: Prisma.PlatformPaymentGetPayload<{ select: typeof paymentSelect }>,
  ): Prisma.InputJsonObject {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      invoiceId: payment.invoiceId,
      amount: String(payment.amount),
      currency: payment.currency,
      method: payment.method,
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paidAt.toISOString(),
    };
  }

  async getSettings() {
    let settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    if (!settings) {
      settings = await this.prisma.platformSettings.create({
        data: { id: 'singleton' },
      });
    }
    return settings;
  }

  async updateSettings(data: Record<string, unknown>) {
    const allowed = [
      'platformName', 'contactEmail', 'supportEmail', 'logoUrl',
      'defaultLocale', 'defaultTimezone',
      'notifyNewLead', 'notifyEmergency', 'notifyPaymentOverdue',
      'notifyTrialExpiring', 'notifyNewTenant', 'notifySuspension', 'emailNotifications',
      'minPasswordLength', 'sessionTimeoutMinutes', 'maxLoginAttempts', 'requireStrongPasswords',
      'invoicePrefix', 'defaultCurrency', 'platformLegalName',
      'platformTaxId', 'platformAddress', 'platformCity', 'platformCountry',
    ];
    const clean: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) clean[key] = data[key];
    }
    return this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: clean,
      create: { id: 'singleton', ...clean },
    });
  }
}






