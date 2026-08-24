import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  body: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
