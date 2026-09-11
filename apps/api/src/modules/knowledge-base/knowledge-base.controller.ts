import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { KnowledgeBaseService } from './knowledge-base.service';

@ApiTags('Knowledge Base')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('categories')
  findCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeBaseService.findCategories(user.tenantId);
  }

  @Post('categories')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.knowledgeBaseService.createCategory(user.tenantId, dto);
  }

  @Patch('categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.knowledgeBaseService.updateCategory(user.tenantId, id, dto);
  }

  @Get('articles')
  findArticles(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeBaseService.findArticles(user.tenantId);
  }

  @Post('articles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createArticle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateArticleDto,
  ) {
    return this.knowledgeBaseService.createArticle(user.tenantId, dto);
  }

  @Patch('articles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateArticle(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.knowledgeBaseService.updateArticle(user.tenantId, id, dto);
  }
}
