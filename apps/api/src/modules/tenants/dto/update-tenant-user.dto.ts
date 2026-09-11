import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTenantUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // INVITED is intentionally excluded — it's a defined-but-unused status in
  // this codebase, not a real state this toggle should ever set.
  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';

  // When true, resets the user's password to the fixed default (see
  // DEFAULT_RESET_PASSWORD in tenants.service.ts). Absent/false leaves the
  // current password untouched.
  @IsOptional()
  @IsBoolean()
  resetPassword?: boolean;
}
