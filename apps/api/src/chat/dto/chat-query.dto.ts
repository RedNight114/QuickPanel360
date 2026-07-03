import { Type } from 'class-transformer';
import { IsOptional, IsString, Max, Min } from 'class-validator';

export class ChatMessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
