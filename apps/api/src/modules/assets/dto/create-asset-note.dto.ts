import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAssetNoteDto {
  @IsString()
  label: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;
}
