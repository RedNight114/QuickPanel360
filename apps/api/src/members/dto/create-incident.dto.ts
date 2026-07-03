import { IncidentSeverity, IncidentType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentDto {
  @IsEnum(IncidentType)
  type: IncidentType;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}
