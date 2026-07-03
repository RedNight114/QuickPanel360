import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PayReceivableDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
