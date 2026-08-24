import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '../../generated/prisma/client';

export interface RequestContext {
  tx: Prisma.TransactionClient;
  tenantId: string | null;
  userId: string | null;
  roles: string[] | null;
}

export const tenantContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Every tenant-scoped query MUST go through this transaction client: it is the
 * one bound to the Postgres session where `app.tenant_id` was set, which is what
 * the RLS policies check. Reaching for PrismaService directly bypasses RLS.
 */
export function getTenantTx(): Prisma.TransactionClient {
  const ctx = tenantContextStorage.getStore();
  if (!ctx) {
    throw new Error(
      'No tenant context available outside of a request (is TenantTransactionInterceptor applied?)',
    );
  }
  return ctx.tx;
}

export function getRequestContext(): RequestContext {
  const ctx = tenantContextStorage.getStore();
  if (!ctx) {
    throw new Error('No request context available outside of a request');
  }
  return ctx;
}
