import { apiFetch } from "@/lib/api";
import type { ArticleVisibility, KnowledgeArticle, KnowledgeCategory } from "@/lib/types";

interface ApiCategory {
  id: string;
  nameFr: string;
  nameEn: string;
  articleCount: number;
}

interface ApiArticle {
  id: string;
  categoryId: string | null;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  visibility: ArticleVisibility;
  updatedAt: string;
}

export async function listKnowledgeCategories(locale: string): Promise<KnowledgeCategory[]> {
  const categories = await apiFetch<ApiCategory[]>("/knowledge-base/categories");
  return categories.map((category) => ({
    id: category.id,
    name: locale === "fr" ? category.nameFr : category.nameEn,
    articleCount: category.articleCount,
  }));
}

export async function listKnowledgeArticles(locale: string): Promise<KnowledgeArticle[]> {
  const articles = await apiFetch<ApiArticle[]>("/knowledge-base/articles");
  return articles.map((article) => ({
    id: article.id,
    categoryId: article.categoryId,
    title: locale === "fr" ? article.titleFr : article.titleEn,
    body: locale === "fr" ? article.bodyFr : article.bodyEn,
    visibility: article.visibility,
    updatedAt: article.updatedAt,
  }));
}
