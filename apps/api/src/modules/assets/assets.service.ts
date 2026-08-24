import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetType, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetNoteDto } from './dto/create-asset-note.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetNoteDto } from './dto/update-asset-note.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

const UNASSIGNABLE_TYPES: AssetType[] = [
  AssetType.SWITCH,
  AssetType.ROUTER,
  AssetType.SERVER,
  AssetType.PRINTER,
];

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Same cross-tenant browsing pattern as TenantsService: internal staff manage
  // client companies' asset inventories, which lives outside their own tenant's RLS scope.
  private async assertInternalStaff(requesterTenantId: string) {
    const requesterTenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: requesterTenantId },
    });
    if (requesterTenant.type !== 'INTERNAL') {
      throw new ForbiddenException(
        'Only internal staff can manage client assets',
      );
    }
  }

  private async assertClientTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    if (tenant.type !== 'CLIENT') {
      throw new ForbiddenException('Target tenant is not a client company');
    }
  }

  async findAll(requesterTenantId: string, tenantId: string) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return tx.asset.findMany({
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              roles: true,
            },
          },
          notes: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { assetTag: 'asc' },
      });
    });
  }

  async create(
    requesterTenantId: string,
    tenantId: string,
    dto: CreateAssetDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return tx.asset.create({
        data: {
          tenantId,
          assetTag: dto.assetTag,
          type: dto.type,
          model: dto.model,
          status: dto.status,
          assigneeId: UNASSIGNABLE_TYPES.includes(dto.type)
            ? null
            : dto.assigneeId,
          location: dto.location,
          serialNumber: dto.serialNumber,
        },
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              roles: true,
            },
          },
          notes: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  async update(
    requesterTenantId: string,
    tenantId: string,
    assetId: string,
    dto: UpdateAssetDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      const existing = await tx.asset.findUnique({ where: { id: assetId } });
      if (!existing) {
        throw new NotFoundException('Asset introuvable');
      }

      const nextType = dto.type ?? existing.type;
      return tx.asset.update({
        where: { id: assetId },
        data: {
          assetTag: dto.assetTag,
          type: dto.type,
          model: dto.model,
          status: dto.status,
          assigneeId: UNASSIGNABLE_TYPES.includes(nextType)
            ? null
            : dto.assigneeId,
          location: dto.location,
          serialNumber: dto.serialNumber,
        },
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              roles: true,
            },
          },
          notes: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  private async assertAssetInTenant(
    tx: Prisma.TransactionClient,
    assetId: string,
  ) {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Asset introuvable');
    }
    return asset;
  }

  async createNote(
    requesterTenantId: string,
    tenantId: string,
    assetId: string,
    dto: CreateAssetNoteDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await this.assertAssetInTenant(tx, assetId);
      return tx.assetNote.create({
        data: {
          assetId,
          label: dto.label,
          value: dto.value,
          sensitive: dto.sensitive ?? false,
        },
      });
    });
  }

  async updateNote(
    requesterTenantId: string,
    tenantId: string,
    assetId: string,
    noteId: string,
    dto: UpdateAssetNoteDto,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await this.assertAssetInTenant(tx, assetId);
      const existing = await tx.assetNote.findUnique({ where: { id: noteId } });
      if (!existing || existing.assetId !== assetId) {
        throw new NotFoundException('Note introuvable');
      }
      return tx.assetNote.update({
        where: { id: noteId },
        data: { label: dto.label, value: dto.value, sensitive: dto.sensitive },
      });
    });
  }

  async deleteNote(
    requesterTenantId: string,
    tenantId: string,
    assetId: string,
    noteId: string,
  ) {
    await this.assertInternalStaff(requesterTenantId);
    await this.assertClientTenant(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await this.assertAssetInTenant(tx, assetId);
      const existing = await tx.assetNote.findUnique({ where: { id: noteId } });
      if (!existing || existing.assetId !== assetId) {
        throw new NotFoundException('Note introuvable');
      }
      await tx.assetNote.delete({ where: { id: noteId } });
      return { id: noteId };
    });
  }
}
