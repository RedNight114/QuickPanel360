import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TenantModuleSettingDto {
  @IsString()
  moduleId: string;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateTenantModulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenantModuleSettingDto)
  modules: TenantModuleSettingDto[];
}

export class CreatePlatformModuleDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdatePlatformModuleDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdatePlanModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];
}
