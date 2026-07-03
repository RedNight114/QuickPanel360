import { ThirdPartyPaymentCategory } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateThirdPartyPaymentDto {
  @IsOptional()
  @IsString()
  thirdPartyId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(ThirdPartyPaymentCategory)
  category?: ThirdPartyPaymentCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
