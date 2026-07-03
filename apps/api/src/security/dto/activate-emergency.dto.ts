import { IsOptional, IsString } from 'class-validator';

export class ActivateEmergencyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
