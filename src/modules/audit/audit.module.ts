import { Module } from '@nestjs/common';
import { AuditConsumer } from './audit.consumer';
import { AuditRepositoryPrisma } from './audit.repository';
import { AuditController } from './audit.controller';
import { SseService } from '../../common';

@Module({
  providers: [SseService, AuditConsumer, AuditRepositoryPrisma],
  controllers: [AuditController],
})
export class AuditModule {}
