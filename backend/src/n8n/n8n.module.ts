import { Module } from '@nestjs/common';
import { N8nDispatcherService } from './n8n-dispatcher.service';

@Module({
  providers: [N8nDispatcherService],
  exports: [N8nDispatcherService],
})
export class N8nModule {}
