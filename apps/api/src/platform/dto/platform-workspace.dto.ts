import {
  OnboardingTaskStatus,
  TenantLifecycleStage,
  TenantRiskLevel,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTenantWorkspaceDto {
  @IsOptional()
  @IsEnum(TenantLifecycleStage)
  lifecycleStage?: TenantLifecycleStage;

  @IsOptional()
  @IsEnum(TenantRiskLevel)
  riskLevel?: TenantRiskLevel;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  platformNotes?: string;

  @IsOptional()
  @IsDateString()
  lastContactAt?: string | null;

  @IsOptional()
  @IsDateString()
  onboardingStartedAt?: string | null;

  @IsOptional()
  @IsDateString()
  onboardingCompletedAt?: string | null;

  @IsOptional()
  @IsDateString()
  activatedAt?: string | null;
}

export class CreateTenantContactDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateTenantContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateTenantOnboardingTaskDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(OnboardingTaskStatus)
  status?: OnboardingTaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  owner?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTenantOnboardingTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(OnboardingTaskStatus)
  status?: OnboardingTaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  owner?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
