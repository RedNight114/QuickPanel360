import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResolvePlatformEmergencyDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class ActivatePlatformEmergencyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
