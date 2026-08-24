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
  findCategories() {
    return this.knowledgeBaseService.findCategories();
  }

  @Post('categories')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.knowledgeBaseService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.knowledgeBaseService.updateCategory(id, dto);
  }

  @Get('articles')
  findArticles() {
    return this.knowledgeBaseService.findArticles();
  }

  @Post('articles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createArticle(@Body() dto: CreateArticleDto) {
    return this.knowledgeBaseService.createArticle(dto);
  }

  @Patch('articles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.knowledgeBaseService.updateArticle(id, dto);
  }
}
