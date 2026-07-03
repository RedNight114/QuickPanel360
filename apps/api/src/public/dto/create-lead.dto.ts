import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  requestedPlanId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedUsers?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsBoolean()
  consentGiven: boolean;
}
