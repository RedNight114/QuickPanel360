import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterChatDeviceKeyDto {
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  deviceId: string;

  @IsString()
  @MinLength(40)
  publicKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  algorithm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  userAgent?: string;
}
