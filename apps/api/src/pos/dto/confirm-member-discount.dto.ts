import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class ConfirmMemberDiscountDto {
  @IsBoolean()
  applyMemberClassDiscount: boolean;

  @IsBoolean()
  applyBirthdayDiscount: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDiscountOverride?: number;
}
