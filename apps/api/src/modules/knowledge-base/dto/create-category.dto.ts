import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  nameFr: string;

  @IsOptional()
  @IsString()
  nameEn?: string;
}
