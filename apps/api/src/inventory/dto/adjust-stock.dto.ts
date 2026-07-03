import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdjustStockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  newQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  newQuantityKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  newQuantityGrams?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
