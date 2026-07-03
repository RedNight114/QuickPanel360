import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelThirdPartyPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  reason: string;
}
