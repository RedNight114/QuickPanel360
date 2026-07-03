import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MemberClass } from '@prisma/client';

export class UpsertMemberClassDto {
  @IsEnum(MemberClass)
  memberClass: MemberClass;

  @IsString()
  @MaxLength(80)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedBonification?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  birthdayBonification?: number;

  @IsOptional()
  @IsBoolean()
  requirePhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
