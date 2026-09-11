import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '../../../generated/prisma/client';
import { generateEmployeeCode } from '../../common/generate-employee-code';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateUserLicenseDto } from './dto/create-user-license.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

// The shape of a P2002 error's `meta` differs by Prisma engine and by
// constraint shape: the classic query engine puts the conflicting column(s)
// in `meta.target`; the driver-adapter engine (used here) nests them under
// `meta.driverAdapterError.cause.constraint.fields` for a single-column
// constraint, but leaves `constraint` entirely undefined for a composite one
// (e.g. the `[tenantId, email]` unique index) — only the raw Postgres error
// message names the constraint there, so fall back to a substring check on
// it as a last resort.
// Fixed reset target — the SUPER_ADMIN "Réinitialiser le mot de passe" action
// sets it to this literal value rather than generating/emailing a new one.
const DEFAULT_RESET_PASSWORD = 'Bru3477*';

function isUniqueConflictOn(err: unknown, field: string): boolean {
  if (
    !(err instanceof Prisma.PrismaClientKnownRequestError) ||
    err.code !== 'P2002'
  ) {
    return false;
  }
  const meta = err.meta as
    | {
        target?: string[] | string;
        driverAdapterError?: {
          cause?: {
            constraint?: { fields?: string[] };
            originalMessage?: string;
          };
        };
      }
    | undefined;
  const target = meta?.target;
  const targetFields = Array.isArray(target)
    ? target
    : typeof target === 'string'
      ? [target]
      : [];
  const cause = meta?.driverAdapterError?.cause;
  const driverFields = cause?.constraint?.fields ?? [];
  const message = cause?.originalMessage ?? '';
  return (
    targetFields.includes(field) ||
    driverFields.includes(field) ||
    message.includes(field)
  );
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tenant rows are not RLS-protected (they have no tenant_id of their own),
  // so platform-level management goes through PrismaService directly.
  // Creating a company no longer creates any employee alongside it — that's
  // a fully separate SUPER_ADMIN action now (see createTenantUser below), so
  // a company can legitimately exist with zero employees until then.
  async create(dto: CreateTenantDto) {
    const baseSlug = slugify(dto.name);

    // The slug is derived from the company name and never shown to the super
    // admin — collisions are plausible (similarly-named companies), so retry
    // with a short random suffix instead of surfacing a raw constraint error,
    // mirroring the retry pattern already used for ticket numbers.
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug =
        attempt === 0 ? baseSlug : `${baseSlug}-${randomSlugSuffix()}`;
      try {
        return await this.prisma.tenant.create({
          data: {
            name: dto.name,
            slug,
            type: dto.type,
            address: dto.address,
            companyNumber: dto.companyNumber,
          },
        });
      } catch (err) {
        if (!isUniqueConflictOn(err, 'slug') || attempt === 4) {
          throw err;
        }
      }
    }
    throw new Error('Unable to allocate a workspace slug');
  }

  // Adds an employee to an already-existing client company. SUPER_ADMIN only,
  // by design: keeping employee provisioning centralized (rather than letting
  // client companies self-manage via their own admin) is what keeps the
  // client-facing process simple — the client never juggles an admin role.
  async createTenantUser(
    requesterTenantId: string,
    tenantId: string,
    dto: CreateTenantUserDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      try {
        return await tx.user.create({
          data: {
            tenantId,
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            employeeCode: generateEmployeeCode(),
            roles: ['CUSTOMER'],
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: true,
            phone: true,
            employeeCode: true,
            roles: true,
            status: true,
            createdAt: true,
          },
        });
      } catch (err) {
        if (isUniqueConflictOn(err, 'email')) {
          throw new ConflictException(
            'Un autre utilisateur de cette entreprise utilise déjà cet email',
          );
        }
        throw err;
      }
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id } });
  }

  // Editing a client company's own record (name/address/company number) —
  // gated to SUPER_ADMIN by the controller's class-level @Roles, scoped here
  // to CLIENT tenants only. The slug is intentionally left untouched even if
  // the name changes: it's an internal identifier now, never shown in the UI.
  async update(
    requesterTenantId: string,
    tenantId: string,
    dto: UpdateTenantDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        address: dto.address,
        companyNumber: dto.companyNumber,
        active: dto.active,
      },
    });
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
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        companyNumber: true,
        active: true,
        createdAt: true,
      },
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
          employeeCode: true,
          roles: true,
          status: true,
          createdAt: true,
          licenses: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { firstName: 'asc' },
      });
    });
  }

  // Editing a client company employee's name/email/status — gated to
  // SUPER_ADMIN by the controller's class-level @Roles. Same cross-tenant
  // transaction pattern as licenses (the requester's own tenant is INTERNAL,
  // the target user lives in a different, CLIENT tenant). Disabling relies
  // on AuthService.login already rejecting non-ACTIVE users — this endpoint
  // doesn't need to touch sessions/tokens directly.
  async updateUser(
    requesterTenantId: string,
    tenantId: string,
    userId: string,
    dto: UpdateTenantUserDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    const passwordHash = dto.resetPassword
      ? await argon2.hash(DEFAULT_RESET_PASSWORD)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await this.assertUserInTenant(tx, userId);
      try {
        return await tx.user.update({
          where: { id: userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            status: dto.status,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: true,
            phone: true,
            employeeCode: true,
            roles: true,
            status: true,
            createdAt: true,
          },
        });
      } catch (err) {
        if (isUniqueConflictOn(err, 'email')) {
          throw new ConflictException(
            'Un autre utilisateur de cette entreprise utilise déjà cet email',
          );
        }
        throw err;
      }
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
