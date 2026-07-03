import { ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class CreateGroupConversationDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];
}
