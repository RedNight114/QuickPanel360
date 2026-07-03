import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ClosePosSessionDto {
  @IsNumber()
  @Min(0)
  closingCash: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  discrepancyReason?: string;

  @IsOptional()
  @IsString()
  closingSignature?: string;
}
