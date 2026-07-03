import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { ScaleToleranceAction } from '@prisma/client';

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  allowCreditSales?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCreditReason?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSpecialSales?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCashCloseConfirmation?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerateMemberNumber?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  memberNumberPrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumMemberAge?: number;

  @IsOptional()
  @IsBoolean()
  showSecurityBadges?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAccessLink?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCashDiscrepancyClose?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCashDiscrepancyReason?: boolean;

  @IsOptional()
  @IsBoolean()
  scaleVerificationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requireScaleVerification?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWastePerLineGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWastePercent?: number;

  @IsOptional()
  @IsEnum(ScaleToleranceAction)
  scaleToleranceAction?: ScaleToleranceAction;

  @IsOptional()
  @IsBoolean()
  allowUnderWeight?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @IsIn([0.001, 0.01, 0.1])
  scalePrecisionGrams?: number;

  @IsOptional()
  @IsBoolean()
  autoRegisterScaleWaste?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  scaleWasteReason?: string;

  @IsOptional()
  @IsBoolean()
  showScaleStepOnMobile?: boolean;

  @IsOptional()
  @IsBoolean()
  requireMemberPhoto?: boolean;

  // ── Inventario ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  blockDispensationIfNoStock?: boolean;

  @IsOptional()
  @IsBoolean()
  lowStockAlertEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThresholdGrams?: number;

  @IsOptional()
  @IsBoolean()
  requireAdjustmentReason?: boolean;

  @IsOptional()
  @IsBoolean()
  requireWasteReason?: boolean;

  @IsOptional()
  @IsBoolean()
  showNegativeScaleDiff?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['g', 'kg'])
  inventoryDisplayUnit?: string;

  // ── Caja ────────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsNumber()
  @Min(0)
  recommendedOpeningCash?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  alertOpenCashSessionMinutes?: number;

  // ── Apariencia ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @IsIn(['comfortable', 'compact'])
  defaultDensity?: string;

  // ── Punto de dispensación ───────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quickWeightValuesGrams?: string;

  @IsOptional()
  @IsBoolean()
  showReceiptAfterSale?: boolean;

  // ── Notificaciones del club ──────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  notifyLowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCashDiscrepancy?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyHighWaste?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMemberBirthday?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyHighReceivables?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyEmergency?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySupportActivity?: boolean;
}
