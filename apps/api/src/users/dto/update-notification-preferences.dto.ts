import { NotificationType } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsBoolean()
  enabled: boolean;
}
