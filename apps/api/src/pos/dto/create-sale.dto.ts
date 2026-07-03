import { PaymentMethod, SaleItemPricingMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  quantityKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantityGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountEuros?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantityUnits?: number;

  @IsOptional()
  @IsEnum(SaleItemPricingMode)
  pricingMode?: SaleItemPricingMode;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  actualWeightGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  actualWeightKg?: number;

  @IsOptional()
  @IsBoolean()
  scaleVerified?: boolean;

  @IsOptional()
  @IsString()
  scaleOverrideReason?: string;
}

export class CreateSalePaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class CreateSaleDto {
  @IsString()
  memberId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cashReceived: number;

  @IsOptional()
  @IsString()
  creditReason?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments?: CreateSalePaymentDto[];
}
