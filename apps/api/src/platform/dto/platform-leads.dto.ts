import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ConvertLeadToTenantDto {
  @IsString()
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  ownerPassword: string;

  @IsOptional()
  @IsString()
  planId?: string | null;
}
