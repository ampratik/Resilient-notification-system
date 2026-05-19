import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { BullBoardService } from './modules/notification/services/bull-board.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const bullBoardService = app.get(BullBoardService);
  app.use('/admin/queues', bullBoardService.getRouter());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();