import {
  ThirdPartyPaymentCategory,
  ThirdPartyPaymentStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ThirdPartyPaymentsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  thirdPartyId?: string;

  @IsOptional()
  @IsEnum(ThirdPartyPaymentCategory)
  category?: ThirdPartyPaymentCategory;

  @IsOptional()
  @IsEnum(ThirdPartyPaymentStatus)
  status?: ThirdPartyPaymentStatus;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  take?: number;
}
