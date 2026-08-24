import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetStatus, AssetType } from '../../../../generated/prisma/client';

export class CreateAssetDto {
  @IsString()
  assetTag: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsString()
  model: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;
}
