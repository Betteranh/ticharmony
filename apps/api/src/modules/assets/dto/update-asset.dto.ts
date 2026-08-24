import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetStatus, AssetType } from '../../../../generated/prisma/client';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  assetTag?: string;

  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
  @IsString()
  model?: string;

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
