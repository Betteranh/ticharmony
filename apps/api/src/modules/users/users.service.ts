import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../../generated/prisma/client';
import { generateEmployeeCode } from '../../common/generate-employee-code';
import { isUniqueConflictOn } from '../../common/prisma-errors';
import { getRequestContext, getTenantTx } from '../../common/tenant-context';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

  // Edit an employee's own name/email, or toggle their activation status —
  // both self-service within the caller's own tenant (RLS via getTenantTx()),
  // reserved to ADMIN/SUPER_ADMIN at the controller level like `create`.
  // Deliberately no delete: a User with any ticket/comment can't be removed
  // without breaking that foreign key, and deactivation already covers the
  // same need everywhere else in this project (tenants, assets) — same
  // reasoning applies here, see DECISIONS.md.
  async update(id: string, dto: UpdateUserDto) {
    const { userId } = getRequestContext();
    if (dto.status === 'DISABLED' && id === userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas désactiver votre propre compte',
      );
    }

    try {
      return await getTenantTx().user.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          status: dto.status,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          employeeCode: true,
          roles: true,
          status: true,
        },
      });
    } catch (err) {
      if (isUniqueConflictOn(err, 'email')) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      throw err;
    }
  }
}
