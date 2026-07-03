import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
