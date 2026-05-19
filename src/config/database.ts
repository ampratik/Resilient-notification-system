import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Notification } from '../modules/notification/entities/notification.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.database'),
  entities: [Notification],
  synchronize: true, // Use migrations in production
  logging: configService.get('nodeEnv') === 'development',
});
