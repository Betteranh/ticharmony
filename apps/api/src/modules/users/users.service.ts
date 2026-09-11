import { ForbiddenException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../../generated/prisma/client';
import { generateEmployeeCode } from '../../common/generate-employee-code';
import { getRequestContext, getTenantTx } from '../../common/tenant-context';
import { CreateUserDto } from './dto/create-user.dto';

// Roles assignable through self-service tenant user management, by tenant type.
// SUPER_ADMIN is deliberately excluded from both — it's a platform-bootstrap role,
// never granted through this endpoint (seed/manual only).
const ASSIGNABLE_ROLES_BY_TENANT_TYPE: Record<
  'INTERNAL' | 'CLIENT',
  UserRole[]
> = {
  INTERNAL: [UserRole.AGENT, UserRole.ADMIN],
  CLIENT: [UserRole.CUSTOMER],
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const { tenantId } = getRequestContext();
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId! },
    });

    const allowedRoles = ASSIGNABLE_ROLES_BY_TENANT_TYPE[tenant.type];
    const hasDisallowedRole = dto.roles.some(
      (role) => !allowedRoles.includes(role),
    );
    if (hasDisallowedRole) {
      throw new ForbiddenException(
        `Rôles autorisés pour ce tenant : ${allowedRoles.join(', ')}`,
      );
    }

    const passwordHash = await argon2.hash(dto.password);
    return getTenantTx().user.create({
      data: {
        tenantId: tenantId!,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatar: dto.avatar,
        department: dto.department,
        location: dto.location,
        phone: dto.phone,
        employeeCode: generateEmployeeCode(),
        roles: dto.roles,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        department: true,
        location: true,
        phone: true,
        employeeCode: true,
        roles: true,
        status: true,
      },
    });
  }

  findAll() {
    return getTenantTx().user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        department: true,
        location: true,
        phone: true,
        employeeCode: true,
        roles: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return getTenantTx().user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        department: true,
        location: true,
        phone: true,
        employeeCode: true,
        roles: true,
        status: true,
        tenant: { select: { type: true } },
      },
    });
  }
}
