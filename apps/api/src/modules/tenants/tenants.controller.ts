import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateUserLicenseDto } from './dto/create-user-license.dto';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  // Listed before ':id' so the literal path wins; reachable by support staff
  // (not just SUPER_ADMIN) to power the cross-tenant Active Directory tool.
  @Get('clients')
  @Roles('ADMIN', 'AGENT', 'SUPER_ADMIN')
  findClients(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantsService.findClients(user.tenantId);
  }

  @Get(':tenantId/users')
  @Roles('ADMIN', 'AGENT', 'SUPER_ADMIN')
  findClientUsers(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
  ) {
    return this.tenantsService.findClientUsers(user.tenantId, tenantId);
  }

  @Post(':tenantId/users/:userId/licenses')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createLicense(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: CreateUserLicenseDto,
  ) {
    return this.tenantsService.createLicense(
      user.tenantId,
      tenantId,
      userId,
      dto,
    );
  }

  @Delete(':tenantId/users/:userId/licenses/:licenseId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteLicense(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Param('licenseId') licenseId: string,
  ) {
    return this.tenantsService.deleteLicense(
      user.tenantId,
      tenantId,
      userId,
      licenseId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }
}
