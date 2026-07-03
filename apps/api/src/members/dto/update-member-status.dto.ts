import { MemberStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberStatusDto {
  @IsEnum(MemberStatus)
  status: MemberStatus;
}
