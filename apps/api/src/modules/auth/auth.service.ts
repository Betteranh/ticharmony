import {
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma, Tenant } from '../../../generated/prisma/client';
import { generateEmployeeCode } from '../../common/generate-employee-code';
import { getTenantTx } from '../../common/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateMeDto } from './dto/update-me.dto';

interface TokenPayload {
  sub: string;
  tenantId: string;
  roles: string[];
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Self-serve signup is for individuals only. Each person gets their own
  // single-user tenant (a personal support space) with an auto-generated slug
  // derived from their email, since they never choose or see a workspace ID.
  // Organizations go through the SUPER_ADMIN-only tenant onboarding instead.
  async signup(dto: SignupDto) {
    const passwordHash = await argon2.hash(dto.password);
    const baseSlug =
      dto.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'membre';

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      try {
        const { tenant, user } = await this.prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.create({
            data: {
              name: `${dto.firstName} ${dto.lastName}`,
              slug,
              type: 'CLIENT',
            },
          });

          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          const user = await tx.user.create({
            data: {
              tenantId: tenant.id,
              email: dto.email,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              avatar: dto.avatar,
              employeeCode: generateEmployeeCode(),
              roles: ['CUSTOMER'],
            },
          });

          return { tenant, user };
        });

        const tokens = await this.issueTokens(
          user.id,
          tenant.id,
          user.roles,
          user.email,
        );
        return { ...tokens, tenantSlug: tenant.slug };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException(
      'Impossible de créer votre espace, veuillez réessayer',
    );
  }

  async login(dto: LoginDto) {
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      });
      if (!tenant) {
        throw new UnauthorizedException('Identifiants invalides');
      }
      return this.authenticateInTenant(tenant, dto);
    }

    // No workspace given: most people only ever belong to one tenant, so we
    // resolve it from the email alone and only ask to disambiguate in the
    // rare case the same email exists in several tenants.
    const tenants = await this.findTenantsForEmail(dto.email);
    if (tenants.length === 0) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (tenants.length > 1) {
      throw new HttpException(
        {
          requiresTenantSelection: true,
          tenants: tenants.map((t) => ({ slug: t.slug, name: t.name })),
        },
        409,
      );
    }
    return this.authenticateInTenant(tenants[0], dto);
  }

  private async authenticateInTenant(tenant: Tenant, dto: LoginDto) {
    // Pre-auth lookup: no req.user yet for TenantTransactionInterceptor to read,
    // so this transaction sets the RLS tenant context itself.
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
      return tx.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
      });
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Password checked before revealing *why* access is refused (disabled
    // account/company) — proves the caller actually knows the credential
    // before we confirm the account exists and its state, same principle as
    // never revealing account existence to a caller who only guessed right.
    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!tenant.active) {
      throw new UnauthorizedException(
        'Le service de votre entreprise a été suspendu. Contactez votre administrateur.',
      );
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Votre compte a été désactivé. Contactez votre administrateur.',
      );
    }

    return this.issueTokens(user.id, tenant.id, user.roles, user.email);
  }

  // Cross-tenant lookup by email, used only to route login when no workspace
  // is given. Each tenant's users are RLS-isolated, so this has to loop and
  // set app.tenant_id per tenant — same pattern as TenantsService.findClients()
  // for its per-tenant userCount. Resolves on existence only (not status) —
  // filtering out a disabled account/tenant here would make it resolve to
  // zero tenants and fall back to the generic "invalid credentials" message,
  // never reaching authenticateInTenant's password check and specific
  // disabled-account/company message.
  private async findTenantsForEmail(email: string): Promise<Tenant[]> {
    const allTenants = await this.prisma.tenant.findMany();
    const matches = await Promise.all(
      allTenants.map(async (tenant) => {
        const user = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          return tx.user.findUnique({
            where: { tenantId_email: { tenantId: tenant.id, email } },
            select: { id: true },
          });
        });
        return user ? tenant : null;
      }),
    );
    return matches.filter((t): t is Tenant => t !== null);
  }

  private async issueTokens(
    sub: string,
    tenantId: string,
    roles: string[],
    email: string,
  ) {
    const payload = { sub, tenantId, roles, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { expiresIn: '15m' }),
      this.jwt.signAsync(payload, { expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  // Re-checks tenant/user status on every refresh, not just at login — the
  // access token is short-lived (15m), but the refresh token lasts 7 days,
  // so without this a disabled account/company could keep silently
  // refreshing valid sessions long after being disabled. No specific message
  // here (unlike login): a refresh happens invisibly in the background, so
  // revealing *why* would leak account state without proof of a password.
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken);
      const stillActive = await this.isUserActiveInTenant(
        payload.sub,
        payload.tenantId,
      );
      if (!stillActive) {
        throw new UnauthorizedException('Refresh token invalide');
      }
      return this.issueTokens(
        payload.sub,
        payload.tenantId,
        payload.roles,
        payload.email,
      );
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  private async isUserActiveInTenant(
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || !tenant.active) {
      return false;
    }
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return tx.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
    });
    return user?.status === 'ACTIVE';
  }

  // Self-service profile edit (Settings → Profil) — name and avatar only.
  // Open to every authenticated user regardless of role, scoped to their own
  // row via getTenantTx() (RLS) + the caller's own id, never someone else's.
  async updateMe(userId: string, dto: UpdateMeDto) {
    return getTenantTx().user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatar: dto.avatar,
      },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });
  }

  // Self-service password change (Settings → Compte) — current password
  // must be proven before a new one is accepted, same principle as every
  // other password-gated action in this service.
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await getTenantTx().user.findUniqueOrThrow({
      where: { id: userId },
    });
    const currentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const passwordHash = await argon2.hash(dto.newPassword);
    await getTenantTx().user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true };
  }
}
