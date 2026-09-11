import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';

// Open Data: no guard on this controller at all — these routes are meant to
// be reachable by an anonymous visitor (CDC exigence F3), unlike the rest of
// the knowledge-base API which sits behind JwtAuthGuard in
// KnowledgeBaseController. Kept as a separate controller class rather than a
// per-route bypass so "no authentication required" stays visible at a glance.
@ApiTags('Open Data')
@Controller('knowledge-base/public')
export class KnowledgeBasePublicController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @ApiOperation({
    summary:
      'Articles publics de la base de connaissances (aucune authentification requise)',
    description:
      'Sous-ensemble ouvert de la base de connaissances : uniquement les articles globaux ' +
      '(non rattachés à un tenant) et marqués PUBLIC. Destiné à un usage Open Data / consultation ' +
      "par un visiteur non connecté, conformément à l'exigence F3 du cahier des charges.",
  })
  @Get('articles')
  findPublicArticles() {
    return this.knowledgeBaseService.findPublicArticles();
  }
}
