import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ArticleVisibility } from '../../../../generated/prisma/client';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  titleFr?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  bodyFr?: string;

  @IsOptional()
  @IsString()
  bodyEn?: string;

  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility;
}
