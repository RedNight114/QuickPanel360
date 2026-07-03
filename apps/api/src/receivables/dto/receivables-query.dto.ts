import { ReceivableStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReceivablesQueryDto {
  @IsOptional()
  @IsEnum(ReceivableStatus)
  status?: ReceivableStatus;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}
