import {
  Controller,
  Get,
  Header,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { Observable } from 'rxjs';
import { PaginationDto, SseService } from '../../common';
import { toAuditEvent } from './audit-event';
import { AuditRepositoryPrisma } from './audit.repository';

class AuditPaginationDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

@Controller('audit')
export class AuditController {
  constructor(
    private readonly sseService: SseService,
    private readonly auditRepo: AuditRepositoryPrisma,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async findPage(@Query() pagination: AuditPaginationDto) {
    const { take, skip, cursor } = pagination;
    const { logs, nextCursor } = await this.auditRepo.findPage(
      take,
      skip,
      cursor,
    );
    return { items: logs.map(toAuditEvent), nextCursor };
  }

  @Sse('stream')
  sse(): Observable<MessageEvent> {
    return this.sseService.getStream();
  }
}
