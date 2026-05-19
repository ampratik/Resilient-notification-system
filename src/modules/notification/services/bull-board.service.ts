import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';

@Injectable()
export class BullBoardService {
  private readonly serverAdapter = new ExpressAdapter();

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectQueue('notifications-dlq') private deadLetterQueue: Queue,
  ) {
    this.serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [
        new BullMQAdapter(this.notificationQueue),
        new BullMQAdapter(this.deadLetterQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  getRouter() {
    return this.serverAdapter.getRouter();
  }
}
