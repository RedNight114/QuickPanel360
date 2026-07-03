import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Prisma,
  ScaleToleranceAction,
  TenantSettings,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

const tenantSelect = {
  id: true,
  name: true,
  legalName: true,
  taxId: true,
  email: true,
  phone: true,
  city: true,
  country: true,
  accessStatus: true,
} satisfies Prisma.TenantSelect;

const settingsSelect = {
  id: true,
  tenantId: true,
  displayName: true,
  logoUrl: true,
  primaryColor: true,
  accentColor: true,
  currency: true,
  locale: true,
  timezone: true,
  allowCreditSales: true,
  requireCreditReason: true,
  allowSpecialSales: true,
  requireCashCloseConfirmation: true,
  autoGenerateMemberNumber: true,
  memberNumberPrefix: true,
  minimumMemberAge: true,
  showSecurityBadges: true,
  requireAccessLink: true,
  allowCashDiscrepancyClose: true,
  requireCashDiscrepancyReason: true,
  scaleVerificationEnabled: true,
  requireScaleVerification: true,
  maxWastePerLineGrams: true,
  maxWastePercent: true,
  scaleToleranceAction: true,
  allowUnderWeight: true,
  scalePrecisionGrams: true,
  autoRegisterScaleWaste: true,
  scaleWasteReason: true,
  showScaleStepOnMobile: true,
  requireMemberPhoto: true,
  blockDispensationIfNoStock: true,
  lowStockAlertEnabled: true,
  lowStockThresholdGrams: true,
  requireAdjustmentReason: true,
  requireWasteReason: true,
  showNegativeScaleDiff: true,
  inventoryDisplayUnit: true,
  recommendedOpeningCash: true,
  alertOpenCashSessionMinutes: true,
  defaultDensity: true,
  quickWeightValuesGrams: true,
  showReceiptAfterSale: true,
  notifyLowStock: true,
  notifyCashDiscrepancy: true,
  notifyHighWaste: true,
  notifyMemberBirthday: true,
  notifyHighReceivables: true,
  notifyEmergency: true,
  notifySupportActivity: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantSettingsSelect;

type SettingsForAudit = Prisma.TenantSettingsGetPayload<{
  select: typeof settingsSelect;
}>;

type SettingsWritableData = {
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  currency?: string;
  locale?: string;
  timezone?: string;
  allowCreditSales?: boolean;
  requireCreditReason?: boolean;
  allowSpecialSales?: boolean;
  requireCashCloseConfirmation?: boolean;
  autoGenerateMemberNumber?: boolean;
  memberNumberPrefix?: string | null;
  minimumMemberAge?: number | null;
  showSecurityBadges?: boolean;
  requireAccessLink?: boolean;
  allowCashDiscrepancyClose?: boolean;
  requireCashDiscrepancyReason?: boolean;
  scaleVerificationEnabled?: boolean;
  requireScaleVerification?: boolean;
  maxWastePerLineGrams?: number;
  maxWastePercent?: number;
  scaleToleranceAction?: ScaleToleranceAction;
  allowUnderWeight?: boolean;
  scalePrecisionGrams?: number;
  autoRegisterScaleWaste?: boolean;
  scaleWasteReason?: string;
  showScaleStepOnMobile?: boolean;
  requireMemberPhoto?: boolean;
  blockDispensationIfNoStock?: boolean;
  lowStockAlertEnabled?: boolean;
  lowStockThresholdGrams?: number;
  requireAdjustmentReason?: boolean;
  requireWasteReason?: boolean;
  showNegativeScaleDiff?: boolean;
  inventoryDisplayUnit?: string;
  recommendedOpeningCash?: number | null;
  alertOpenCashSessionMinutes?: number | null;
  defaultDensity?: string;
  quickWeightValuesGrams?: string;
  showReceiptAfterSale?: boolean;
  notifyLowStock?: boolean;
  notifyCashDiscrepancy?: boolean;
  notifyHighWaste?: boolean;
  notifyMemberBirthday?: boolean;
  notifyHighReceivables?: boolean;
  notifyEmergency?: boolean;
  notifySupportActivity?: boolean;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findSettings(tenantId: string) {
    const [tenant, settings] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: tenantSelect,
      }),
      this.ensureSettings(tenantId),
    ]);

    if (!tenant) {
      throw new NotFoundException('Club no encontrado');
    }

    return {
      tenant,
      settings: this.toSettingsResponse(settings),
    };
  }

  async updateSettings(
    tenantId: string,
    userId: string,
    updateTenantSettingsDto: UpdateTenantSettingsDto,
  ) {
    const previousSettings = await this.ensureSettings(tenantId);
    const previousTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: tenantSelect,
    });

    if (!previousTenant) {
      throw new NotFoundException('Club no encontrado');
    }

    const tenantData = this.pickTenantData(updateTenantSettingsDto);
    const settingsData = this.pickSettingsData(updateTenantSettingsDto);

    return this.prisma.$transaction(async (tx) => {
      const [tenant, settings] = await Promise.all([
        tx.tenant.update({
          where: { id: tenantId },
          data: tenantData,
          select: tenantSelect,
        }),
        tx.tenantSettings.upsert({
          where: { tenantId },
          create: {
            tenantId,
            ...settingsData,
          },
          update: settingsData,
          select: settingsSelect,
        }),
      ]);

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'settings.updated',
        entityType: 'tenant_settings',
        entityId: settings.id,
        oldValue: {
          tenant: previousTenant,
          settings: this.toSettingsResponse(previousSettings),
        },
        newValue: {
          tenant,
          settings: this.toSettingsResponse(settings),
        },
      });

      return {
        tenant,
        settings: this.toSettingsResponse(settings),
      };
    });
  }

  private async ensureSettings(tenantId: string): Promise<SettingsForAudit> {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
      select: settingsSelect,
    });
  }

  private pickTenantData(
    dto: UpdateTenantSettingsDto,
  ): Prisma.TenantUpdateInput {
    return this.removeUndefined({
      name: this.cleanRequiredText(dto.name),
      legalName: this.cleanNullableText(dto.legalName),
      taxId: this.cleanNullableText(dto.taxId),
      email: this.cleanNullableText(dto.email),
      phone: this.cleanNullableText(dto.phone),
      city: this.cleanNullableText(dto.city),
      country: this.cleanRequiredText(dto.country),
    });
  }

  private pickSettingsData(dto: UpdateTenantSettingsDto): SettingsWritableData {
    return this.removeUndefined({
      displayName: this.cleanNullableText(dto.displayName),
      logoUrl: this.cleanNullableText(dto.logoUrl),
      primaryColor: this.cleanNullableText(dto.primaryColor),
      accentColor: this.cleanNullableText(dto.accentColor),
      currency: this.cleanRequiredText(dto.currency)?.toUpperCase(),
      locale: this.cleanRequiredText(dto.locale),
      timezone: this.cleanRequiredText(dto.timezone),
      allowCreditSales: dto.allowCreditSales,
      requireCreditReason: dto.requireCreditReason,
      allowSpecialSales: dto.allowSpecialSales,
      requireCashCloseConfirmation: dto.requireCashCloseConfirmation,
      autoGenerateMemberNumber: dto.autoGenerateMemberNumber,
      memberNumberPrefix: this.cleanNullableText(dto.memberNumberPrefix),
      minimumMemberAge: dto.minimumMemberAge,
      showSecurityBadges: dto.showSecurityBadges,
      requireAccessLink: dto.requireAccessLink,
      allowCashDiscrepancyClose: dto.allowCashDiscrepancyClose,
      requireCashDiscrepancyReason: dto.requireCashDiscrepancyReason,
      scaleVerificationEnabled: dto.scaleVerificationEnabled,
      requireScaleVerification: dto.requireScaleVerification,
      maxWastePerLineGrams: dto.maxWastePerLineGrams,
      maxWastePercent: dto.maxWastePercent,
      scaleToleranceAction: dto.scaleToleranceAction,
      allowUnderWeight: dto.allowUnderWeight,
      scalePrecisionGrams: dto.scalePrecisionGrams,
      autoRegisterScaleWaste: dto.autoRegisterScaleWaste,
      scaleWasteReason: this.cleanRequiredText(dto.scaleWasteReason),
      showScaleStepOnMobile: dto.showScaleStepOnMobile,
      requireMemberPhoto: dto.requireMemberPhoto,
      blockDispensationIfNoStock: dto.blockDispensationIfNoStock,
      lowStockAlertEnabled: dto.lowStockAlertEnabled,
      lowStockThresholdGrams: dto.lowStockThresholdGrams,
      requireAdjustmentReason: dto.requireAdjustmentReason,
      requireWasteReason: dto.requireWasteReason,
      showNegativeScaleDiff: dto.showNegativeScaleDiff,
      inventoryDisplayUnit: this.cleanRequiredText(dto.inventoryDisplayUnit),
      recommendedOpeningCash: dto.recommendedOpeningCash,
      alertOpenCashSessionMinutes: dto.alertOpenCashSessionMinutes,
      defaultDensity: this.cleanRequiredText(dto.defaultDensity),
      quickWeightValuesGrams: this.cleanRequiredText(dto.quickWeightValuesGrams),
      showReceiptAfterSale: dto.showReceiptAfterSale,
      notifyLowStock: dto.notifyLowStock,
      notifyCashDiscrepancy: dto.notifyCashDiscrepancy,
      notifyHighWaste: dto.notifyHighWaste,
      notifyMemberBirthday: dto.notifyMemberBirthday,
      notifyHighReceivables: dto.notifyHighReceivables,
      notifyEmergency: dto.notifyEmergency,
      notifySupportActivity: dto.notifySupportActivity,
    });
  }

  private cleanRequiredText(value?: string) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private cleanNullableText(value?: string | null) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private removeUndefined<T extends Record<string, unknown>>(data: T) {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as T;
  }

  private toSettingsResponse(settings: SettingsForAudit | TenantSettings) {
    return {
      id: settings.id,
      displayName: settings.displayName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      accentColor: settings.accentColor,
      currency: settings.currency,
      locale: settings.locale,
      timezone: settings.timezone,
      allowCreditSales: settings.allowCreditSales,
      requireCreditReason: settings.requireCreditReason,
      allowSpecialSales: settings.allowSpecialSales,
      requireCashCloseConfirmation: settings.requireCashCloseConfirmation,
      autoGenerateMemberNumber: settings.autoGenerateMemberNumber,
      memberNumberPrefix: settings.memberNumberPrefix,
      minimumMemberAge: settings.minimumMemberAge,
      showSecurityBadges: settings.showSecurityBadges,
      requireAccessLink: settings.requireAccessLink,
      allowCashDiscrepancyClose: settings.allowCashDiscrepancyClose,
      requireCashDiscrepancyReason: settings.requireCashDiscrepancyReason,
      scaleVerificationEnabled: settings.scaleVerificationEnabled,
      requireScaleVerification: settings.requireScaleVerification,
      maxWastePerLineGrams: Number(settings.maxWastePerLineGrams),
      maxWastePercent: Number(settings.maxWastePercent),
      scaleToleranceAction: settings.scaleToleranceAction,
      allowUnderWeight: settings.allowUnderWeight,
      scalePrecisionGrams: Number(settings.scalePrecisionGrams),
      autoRegisterScaleWaste: settings.autoRegisterScaleWaste,
      scaleWasteReason: settings.scaleWasteReason,
      showScaleStepOnMobile: settings.showScaleStepOnMobile,
      requireMemberPhoto: settings.requireMemberPhoto,
      blockDispensationIfNoStock: settings.blockDispensationIfNoStock,
      lowStockAlertEnabled: settings.lowStockAlertEnabled,
      lowStockThresholdGrams: Number(settings.lowStockThresholdGrams),
      requireAdjustmentReason: settings.requireAdjustmentReason,
      requireWasteReason: settings.requireWasteReason,
      showNegativeScaleDiff: settings.showNegativeScaleDiff,
      inventoryDisplayUnit: settings.inventoryDisplayUnit,
      recommendedOpeningCash: settings.recommendedOpeningCash != null ? Number(settings.recommendedOpeningCash) : null,
      alertOpenCashSessionMinutes: settings.alertOpenCashSessionMinutes,
      defaultDensity: settings.defaultDensity,
      quickWeightValuesGrams: settings.quickWeightValuesGrams,
      showReceiptAfterSale: settings.showReceiptAfterSale,
      notifyLowStock: settings.notifyLowStock,
      notifyCashDiscrepancy: settings.notifyCashDiscrepancy,
      notifyHighWaste: settings.notifyHighWaste,
      notifyMemberBirthday: settings.notifyMemberBirthday,
      notifyHighReceivables: settings.notifyHighReceivables,
      notifyEmergency: settings.notifyEmergency,
      notifySupportActivity: settings.notifySupportActivity,
    };
  }
}
