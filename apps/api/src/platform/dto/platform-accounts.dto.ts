import { PlatformAccountActivityType, PlatformAccountHealth, PlatformCollectionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class PlatformAccountsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(PlatformAccountHealth)
  accountHealth?: PlatformAccountHealth;

  @IsOptional()
  @IsString()
  accountOwnerId?: string;

  @IsOptional()
  @IsEnum(PlatformCollectionStatus)
  collectionStatus?: PlatformCollectionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  renewalWindowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}

export class PlatformCollectionsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(PlatformCollectionStatus)
  status?: PlatformCollectionStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}

export class UpdateTenantAccountDto {
  @IsOptional()
  @IsString()
  accountOwnerId?: string | null;

  @IsOptional()
  @IsEnum(PlatformAccountHealth)
  accountHealth?: PlatformAccountHealth;

  @IsOptional()
  @IsString()
  nextReviewAt?: string | null;

  @IsOptional()
  @IsString()
  platformNotes?: string | null;

  @IsOptional()
  @IsString()
  lastContactAt?: string | null;
}

export class UpdateTenantCollectionDto {
  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  @IsOptional()
  @IsEnum(PlatformCollectionStatus)
  status?: PlatformCollectionStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  lastContactAt?: string | null;

  @IsOptional()
  @IsString()
  nextActionAt?: string | null;

  @IsOptional()
  @IsString()
  promiseDate?: string | null;

  @IsOptional()
  @IsString()
  closedAt?: string | null;
}

export class CreateTenantAccountActivityDto {
  @IsEnum(PlatformAccountActivityType)
  type!: PlatformAccountActivityType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
