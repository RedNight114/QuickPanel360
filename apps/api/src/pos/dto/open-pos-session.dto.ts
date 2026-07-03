import { IsNumber, Min } from 'class-validator';

export class OpenPosSessionDto {
  @IsNumber()
  @Min(0)
  openingCash: number;
}
