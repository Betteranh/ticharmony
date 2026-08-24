import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { TenantType } from '../../../../generated/prisma/client';

export class CreateTenantDto {
  @IsString()
  name: string;

  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase alphanumeric with dashes only',
  })
  slug: string;

  @IsEnum(TenantType)
  type: TenantType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsString()
  adminFirstName: string;

  @IsString()
  adminLastName: string;

  @IsOptional()
  @IsString()
  adminDepartment?: string;

  @IsOptional()
  @IsString()
  adminLocation?: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;
}
