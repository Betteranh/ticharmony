import { Prisma } from '../../generated/prisma/client';

// The shape of a P2002 error's `meta` differs by Prisma engine and by
// constraint shape: the classic query engine puts the conflicting column(s)
// in `meta.target`; the driver-adapter engine (used here) nests them under
// `meta.driverAdapterError.cause.constraint.fields` for a single-column
// constraint, but leaves `constraint` entirely undefined for a composite one
// (e.g. the `[tenantId, email]` unique index) — only the raw Postgres error
// message names the constraint there, so fall back to a substring check on
// it as a last resort.
export function isUniqueConflictOn(err: unknown, field: string): boolean {
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
