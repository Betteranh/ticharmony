import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { tenantContextStorage } from '../tenant-context';

interface AuthenticatedRequest {
  user?: { sub: string; tenantId: string; roles: string[] };
}

/**
 * Wraps every request in a single Prisma transaction and, when the request is
 * authenticated, sets the Postgres session variable `app.tenant_id` that the
 * RLS policies rely on. Services must read/write through `getTenantTx()`
 * (not PrismaService directly) so they run on this transaction's connection.
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;

    return from(
      this.prisma.$transaction(async (tx) => {
        if (user?.tenantId) {
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${user.tenantId}, true)`;
        }
        return tenantContextStorage.run(
          {
            tx,
            tenantId: user?.tenantId ?? null,
            userId: user?.sub ?? null,
            roles: user?.roles ?? null,
          },
          () => lastValueFrom(next.handle(), { defaultValue: undefined }),
        );
      }),
    );
  }
}
