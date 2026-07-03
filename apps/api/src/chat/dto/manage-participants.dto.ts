import { ChatParticipantRole } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';

export class AddChatParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];
}

export class UpdateChatParticipantRoleDto {
  @IsEnum(ChatParticipantRole)
  role: ChatParticipantRole;
}
