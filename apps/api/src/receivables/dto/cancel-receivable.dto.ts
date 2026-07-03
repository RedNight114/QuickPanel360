import { IsNotEmpty, IsString } from 'class-validator';

export class CancelReceivableDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
