import { IsString, MaxLength } from 'class-validator';

export class ToggleReactionDto {
  @IsString()
  @MaxLength(10)
  emoji: string;
}
