import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('enqueue')
  async enqueueNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.enqueueNotification(createNotificationDto);
  }

  @Get(':id')
  async getNotification(
    @Param('id') notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.getNotification(notificationId);

    if (!notification) {
      throw new NotFoundException(
        `Notification ${notificationId} not found`,
      );
    }

    return notification;
  }

  @Get()
  async getNotifications(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    data: NotificationResponseDto[];
    total: number;
  }> {
    const parsedLimit = limit ? Math.max(1, Math.min(100, Number(limit))) : 20;
    const parsedOffset = offset ? Math.max(0, Number(offset)) : 0;

    return this.notificationService.getNotifications(parsedLimit, parsedOffset);
  }

  @Get('failed/list')
  async getFailedNotifications(
    @Query('limit') limit?: number,
  ): Promise<{
    data: NotificationResponseDto[];
  }> {
    const parsedLimit = limit ? Math.max(1, Math.min(100, Number(limit))) : 100;
    const data = await this.notificationService.getFailedNotifications(parsedLimit);
    return { data };
  }

  @Post('failed/:id/retry')
  async retryFailedNotification(
    @Param('id') notificationId: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.retryFailedNotification(notificationId);
  }
}
