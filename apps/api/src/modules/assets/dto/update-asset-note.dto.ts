import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAssetNoteDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;
}
