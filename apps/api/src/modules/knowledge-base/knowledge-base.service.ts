import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ArticleVisibility,
  Prisma,
  UserRole,
} from '../../../generated/prisma/client';
import { getRequestContext, getTenantTx } from '../../common/tenant-context';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class KnowledgeBaseService {
  private visibilityFilter(): Prisma.KnowledgeArticleWhereInput {
    const { roles } = getRequestContext();
    return roles?.includes(UserRole.CUSTOMER)
      ? { visibility: ArticleVisibility.PUBLIC }
      : {};
  }

  async findCategories() {
    const categories = await getTenantTx().category.findMany({
      select: {
        id: true,
        nameFr: true,
        nameEn: true,
        _count: { select: { articles: { where: this.visibilityFilter() } } },
      },
      orderBy: { nameFr: 'asc' },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      articleCount: _count.articles,
    }));
  }

  findArticles() {
    return getTenantTx().knowledgeArticle.findMany({
      where: this.visibilityFilter(),
      select: {
        id: true,
        categoryId: true,
        titleFr: true,
        titleEn: true,
        bodyFr: true,
        bodyEn: true,
        visibility: true,
        updatedAt: true,
      },
      orderBy: { titleFr: 'asc' },
    });
  }

  // Open Data: global public articles (tenant_id IS NULL, visibility PUBLIC),
  // reachable with no authentication at all — unlike findArticles() above,
  // this never trusts the caller's role and filters explicitly, since an
  // anonymous request carries no role to branch on in visibilityFilter().
  findPublicArticles() {
    return getTenantTx().knowledgeArticle.findMany({
      where: { visibility: ArticleVisibility.PUBLIC, tenantId: null },
      select: {
        id: true,
        titleFr: true,
        titleEn: true,
        bodyFr: true,
        bodyEn: true,
        updatedAt: true,
      },
      orderBy: { titleFr: 'asc' },
    });
  }

  createCategory(dto: CreateCategoryDto) {
    const { tenantId } = getRequestContext();
    return getTenantTx().category.create({
      data: {
        tenantId: tenantId!,
        nameFr: dto.nameFr,
        nameEn: dto.nameEn ?? dto.nameFr,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await getTenantTx().category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Thème introuvable');
    }
    return getTenantTx().category.update({
      where: { id },
      data: {
        nameFr: dto.nameFr,
        nameEn: dto.nameEn ?? dto.nameFr,
      },
    });
  }

  createArticle(dto: CreateArticleDto) {
    const { tenantId } = getRequestContext();
    return getTenantTx().knowledgeArticle.create({
      data: {
        tenantId: tenantId!,
        categoryId: dto.categoryId,
        titleFr: dto.titleFr,
        titleEn: dto.titleEn ?? dto.titleFr,
        bodyFr: dto.bodyFr,
        bodyEn: dto.bodyEn ?? dto.bodyFr,
        visibility: dto.visibility,
      },
    });
  }

  async updateArticle(id: string, dto: UpdateArticleDto) {
    const existing = await getTenantTx().knowledgeArticle.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Article introuvable');
    }
    return getTenantTx().knowledgeArticle.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        titleFr: dto.titleFr,
        titleEn: dto.titleEn ?? dto.titleFr,
        bodyFr: dto.bodyFr,
        bodyEn: dto.bodyEn ?? dto.bodyFr,
        visibility: dto.visibility,
      },
    });
  }
}
