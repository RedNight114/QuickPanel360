import { MemberClass } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberClassDto {
  @IsEnum(MemberClass)
  memberClass: MemberClass;
}
