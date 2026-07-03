import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @IsOptional()
  @IsObject()
  clientEncryptedPayload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
