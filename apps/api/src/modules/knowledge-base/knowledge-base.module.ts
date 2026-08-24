import { Module } from '@nestjs/common';
import { KnowledgeBasePublicController } from './knowledge-base-public.controller';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  controllers: [KnowledgeBaseController, KnowledgeBasePublicController],
  providers: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
