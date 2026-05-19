import { IsUUID, IsEnum, IsString, IsEmail, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  recipient: string;

  @IsString()
  message: string;

  
  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;
}
