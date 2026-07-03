import { MemberClass } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class MemberClassBenefitDto {
  @IsEnum(MemberClass)
  memberClass: MemberClass;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsBoolean()
  birthdayBenefitEnabled: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  birthdayDiscountPercent: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  birthdayGiftNote?: string;

  @IsBoolean()
  allowSpecialCreditLimit: boolean;

  @IsNumber()
  @Min(0)
  creditLimitAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateMemberBenefitsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberClassBenefitDto)
  benefits: MemberClassBenefitDto[];
}
