import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  companyNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
