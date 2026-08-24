import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateUserLicenseDto } from './dto/create-user-license.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tenant rows are not RLS-protected (they have no tenant_id of their own),
  // so platform-level management goes through PrismaService directly.
  // The first admin user must be created in the same transaction, setting
  // app.tenant_id to the *new* tenant (not the super admin's own tenant),
  // since onboarding happens outside any tenant-scoped request context.
  async create(dto: CreateTenantDto) {
    const passwordHash = await argon2.hash(dto.adminPassword);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          type: dto.type,
          address: dto.address,
        },
      });

      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          department: dto.adminDepartment,
          location: dto.adminLocation,
          phone: dto.adminPhone,
          roles: ['ADMIN'],
        },
      });

      return tenant;
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id } });
  }

  // Internal staff (the helpdesk provider) need to browse client companies'
  // directories across tenant boundaries — that's intentionally outside RLS,
  // so we gate it here instead: the requester's own tenant must be INTERNAL.
  private async assertInternalStaff(requesterTenantId: string) {
    const requesterTenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: requesterTenantId },
    });
    if (requesterTenant.type !== 'INTERNAL') {
      throw new ForbiddenException(
        'Only internal staff can browse client directories',
      );
    }
  }

  async findClients(requesterTenantId: string) {
    await this.assertInternalStaff(requesterTenantId);
    const clients = await this.prisma.tenant.findMany({
      where: { type: 'CLIENT' },
      select: { id: true, name: true, slug: true, address: true, createdAt: true },
      orderBy: { name: 'asc' },
    });

    // The `users` table is RLS-protected, so a plain count through PrismaService
    // sees nothing until app.tenant_id is set for that specific client tenant.
    return Promise.all(
      clients.map(async (client) => ({
        ...client,
        userCount: await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${client.id}, true)`;
          return tx.user.count();
        }),
      })),
    );
  }

  private async assertClientTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    if (tenant.type !== 'CLIENT') {
      throw new ForbiddenException('Target tenant is not a client company');
    }
  }

  async findClientUsers(requesterTenantId: string, clientTenantId: string) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(clientTenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${clientTenantId}, true)`;
      return tx.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          department: true,
          phone: true,
          roles: true,
          status: true,
          createdAt: true,
          licenses: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { firstName: 'asc' },
      });
    });
  }

  private async assertUserInTenant(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  async createLicense(
    requesterTenantId: string,
    tenantId: string,
    userId: string,
    dto: CreateUserLicenseDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await this.assertUserInTenant(tx, userId);
      return tx.userLicense.create({
        data: {
          userId,
          name: dto.name,
          email: dto.email,
          password: dto.password,
        },
      });
    });
  }

  async deleteLicense(
    requesterTenantId: string,
    tenantId: string,
    userId: string,
    licenseId: string,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await this.assertUserInTenant(tx, userId);
      const existing = await tx.userLicense.findUnique({
        where: { id: licenseId },
      });
      if (!existing || existing.userId !== userId) {
        throw new NotFoundException('Licence introuvable');
      }
      await tx.userLicense.delete({ where: { id: licenseId } });
      return { id: licenseId };
    });
  }
}
