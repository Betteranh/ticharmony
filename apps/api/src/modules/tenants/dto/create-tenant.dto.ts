import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantType } from '../../../../generated/prisma/client';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsEnum(TenantType)
  type: TenantType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  companyNumber?: string;
}
