import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ArticleVisibility } from '../../../../generated/prisma/client';

export class CreateArticleDto {
  @IsString()
  categoryId: string;

  @IsString()
  titleFr: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  bodyFr: string;

  @IsOptional()
  @IsString()
  bodyEn?: string;

  @IsEnum(ArticleVisibility)
  visibility: ArticleVisibility;
}
