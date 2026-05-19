import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TimeWindowService {
  private readonly logger = new Logger(TimeWindowService.name);
  private readonly businessHoursStart: number;
  private readonly businessHoursEnd: number;

  constructor(private configService: ConfigService) {
    this.businessHoursStart =
      this.configService.get<number>('notification.businessHoursStart') || 8;
    this.businessHoursEnd =
      this.configService.get<number>('notification.businessHoursEnd') || 21;
  }

  isWithinBusinessHours(date: Date = new Date()): boolean {
    const hour = date.getHours();
    const isWithin =
      hour >= this.businessHoursStart && hour < this.businessHoursEnd;
    return isWithin;
  }

  getNextBusinessHourTime(date: Date = new Date()): Date {
    const hour = date.getHours();

    if (hour >= this.businessHoursEnd) {
      // After business hours, next business hour is tomorrow at start time
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(this.businessHoursStart, 0, 0, 0);
      return tomorrow;
    }

    if (hour < this.businessHoursStart) {
      // Before business hours, next business hour is today at start time
      const today = new Date(date);
      today.setHours(this.businessHoursStart, 0, 0, 0);
      return today;
    }

    // Already within business hours
    return date;
  }

  logWindowStatus(notificationId: string, isWithin: boolean): void {
    const status = isWithin ? 'within' : 'outside';
    this.logger.log(
      `[${notificationId}] Current time is ${status} business hours (${this.businessHoursStart}:00 - ${this.businessHoursEnd}:00)`,
    );
  }
}
