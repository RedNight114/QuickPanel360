import { IsOptional, IsString, MinLength } from 'class-validator';

export class OpenSupportSessionDto {
  @IsString()
  @MinLength(8)
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseSupportSessionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
