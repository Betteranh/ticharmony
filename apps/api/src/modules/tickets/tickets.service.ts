import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  Prisma,
  TicketStatus,
  UserRole,
} from '../../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext, getTenantTx } from '../../common/tenant-context';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

// Local disk storage — no cloud provider configured for this project.
// Files are stored under a generated name (collision/path-traversal proof);
// the original filename is kept in the DB for display and download.
const UPLOADS_DIR = join(process.cwd(), 'uploads');

const PERSON_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
  roles: true,
  email: true,
  department: true,
  location: true,
  phone: true,
} satisfies Prisma.UserSelect;

const CATEGORY_SELECT = {
  id: true,
  nameFr: true,
  nameEn: true,
} satisfies Prisma.CategorySelect;

type PersonRecord = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateTicketDto) {
    const { tenantId, userId } = getRequestContext();
    const tx = getTenantTx();

    // Per-tenant sequential ticket numbers. Collisions are rare (single tenant,
    // low concurrency for an MVP helpdesk) and retried via the unique constraint;
    // revisit with a dedicated counter/sequence if write volume grows.
    for (let attempt = 0; attempt < 3; attempt++) {
      const count = await tx.ticket.count({ where: { tenantId: tenantId! } });
      try {
        return await tx.ticket.create({
          data: {
            tenantId: tenantId!,
            number: count + 1,
            title: dto.title,
            description: dto.description,
            priority: dto.priority,
            categoryId: dto.categoryId,
            requesterId: userId!,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < 2
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new Error('Unable to allocate a ticket number');
  }

  async findAll() {
    const { roles, userId, tenantId } = getRequestContext();

    if (await this.isInternalTenant(tenantId!)) {
      return this.findAllForStaff();
    }

    const where: Prisma.TicketWhereInput = roles?.includes(UserRole.CUSTOMER)
      ? { requesterId: userId! }
      : {};
    return getTenantTx().ticket.findMany({
      where,
      include: {
        requester: { select: PERSON_SELECT },
        assignee: { select: PERSON_SELECT },
        category: { select: CATEGORY_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Internal staff (the helpdesk provider) support every client company from
  // the same queue — aggregate every tenant's tickets rather than making them
  // pick a company first (unlike Assets/Directory), per product decision.
  private async findAllForStaff() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    const perTenant = await Promise.all(
      tenants.map(async (tenant) => {
        const tickets = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          return tx.ticket.findMany({
            include: {
              requester: { select: PERSON_SELECT },
              assignee: { select: PERSON_SELECT },
              category: { select: CATEGORY_SELECT },
            },
            orderBy: { createdAt: 'desc' },
          });
        });
        return tickets.map((ticket) => ({ ...ticket, tenant }));
      }),
    );
    const allTickets = perTenant.flat();

    // A ticket's assignee can be an internal-staff member from a *different*
    // tenant than the ticket itself — invisible to the per-tenant `include`
    // above (RLS on `users`). Resolve those separately and splice them back in.
    const missingAssigneeIds = allTickets
      .filter((t) => t.assigneeId && !t.assignee)
      .map((t) => t.assigneeId!);
    const resolvedUsers = await this.resolveForeignUsers(missingAssigneeIds);

    return allTickets
      .map((t) => ({
        ...t,
        assignee:
          t.assignee ??
          (t.assigneeId ? (resolvedUsers.get(t.assigneeId) ?? null) : null),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOne(id: string, tenantIdHint?: string) {
    return this.withTicketTx(tenantIdHint, async (tx, resolvedTenantId) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: {
          requester: { select: PERSON_SELECT },
          assignee: { select: PERSON_SELECT },
          category: { select: CATEGORY_SELECT },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: PERSON_SELECT },
              attachments: {
                select: { id: true, filename: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket introuvable');
      }
      const { roles, userId, tenantId: ownTenantId } = getRequestContext();
      if (roles?.includes(UserRole.CUSTOMER) && ticket.requesterId !== userId) {
        throw new ForbiddenException();
      }

      const missingIds = [
        ...(ticket.assigneeId && !ticket.assignee ? [ticket.assigneeId] : []),
        ...ticket.comments.filter((c) => !c.author).map((c) => c.authorId),
      ];
      const resolvedUsers = await this.resolveForeignUsers(missingIds);
      const patched = {
        ...ticket,
        assignee:
          ticket.assignee ??
          (ticket.assigneeId
            ? (resolvedUsers.get(ticket.assigneeId) ?? null)
            : null),
        comments: ticket.comments.map((c) => ({
          ...c,
          author: c.author ?? resolvedUsers.get(c.authorId) ?? null,
        })),
      };

      // The ticket's own tenant's registered address is shown in the "Reported
      // by" block regardless of viewer — separate from `tenant`, which is only
      // attached for internal staff and signals cross-tenant "Entreprise" UI.
      const tenantRecord = await this.prisma.tenant.findUniqueOrThrow({
        where: { id: resolvedTenantId },
        select: { id: true, name: true, slug: true, address: true },
      });
      const withAddress = { ...patched, tenantAddress: tenantRecord.address };

      if (await this.isInternalTenant(ownTenantId!)) {
        const { id, name, slug } = tenantRecord;
        return { ...withAddress, tenant: { id, name, slug } };
      }
      return withAddress;
    });
  }

  async update(id: string, dto: UpdateTicketDto, tenantIdHint?: string) {
    return this.withTicketTx(tenantIdHint, async (tx, resolvedTenantId) => {
      const existing = await this.assertVisible(tx, id);

      // A plain AGENT can only claim a ticket for themselves or free it back up —
      // reassigning to a *different* technician is a manager action (ADMIN/SUPER_ADMIN).
      const { roles, userId } = getRequestContext();
      const isManager =
        roles?.includes(UserRole.ADMIN) ||
        roles?.includes(UserRole.SUPER_ADMIN);
      if (
        !isManager &&
        dto.assigneeId !== undefined &&
        dto.assigneeId !== null &&
        dto.assigneeId !== userId
      ) {
        throw new ForbiddenException(
          'Seul un admin peut assigner un ticket à un autre technicien',
        );
      }

      const ticket = await tx.ticket.update({
        where: { id },
        data: {
          status: dto.status,
          priority: dto.priority,
          assigneeId: dto.assigneeId,
          closedAt: dto.status === TicketStatus.CLOSED ? new Date() : undefined,
        },
      });

      if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
        // The assignee (self or a technician from GET /users) always belongs
        // to the *acting* staff member's own tenant, never the ticket's.
        await this.notifyOwnTenant(
          tx,
          resolvedTenantId,
          dto.assigneeId,
          'TICKET_ASSIGNED',
          {
            ticketId: ticket.id,
            ticketNumber: ticket.number,
            ticketTitle: ticket.title,
            ticketTenantId: resolvedTenantId,
          },
        );
      }
      if (
        dto.status === TicketStatus.RESOLVED &&
        existing.status !== TicketStatus.RESOLVED
      ) {
        // The requester always belongs to the ticket's own tenant.
        await this.notifications.create(
          tx,
          existing.requesterId,
          'TICKET_RESOLVED',
          {
            ticketId: ticket.id,
            ticketNumber: ticket.number,
            ticketTitle: ticket.title,
            ticketTenantId: resolvedTenantId,
          },
        );
      }

      return ticket;
    });
  }

  async addComment(
    ticketId: string,
    dto: CreateCommentDto,
    tenantIdHint?: string,
  ) {
    return this.withTicketTx(tenantIdHint, async (tx, resolvedTenantId) => {
      const existing = await this.assertVisible(tx, ticketId);
      const { userId, roles } = getRequestContext();
      const isInternal =
        !roles?.includes(UserRole.CUSTOMER) && dto.isInternal === true;
      const comment = await tx.ticketComment.create({
        data: {
          ticketId,
          authorId: userId!,
          body: dto.body,
          isInternal,
        },
        include: { author: { select: PERSON_SELECT } },
      });
      // The author is the current caller, who can themselves be foreign to
      // this transaction's tenant (internal staff commenting on a client ticket).
      const author =
        comment.author ??
        (await this.resolveForeignUsers([userId!])).get(userId!) ??
        null;

      if (!isInternal) {
        const isRequester = userId === existing.requesterId;
        const recipientId = isRequester
          ? existing.assigneeId
          : existing.requesterId;
        if (recipientId && recipientId !== userId) {
          const payload = {
            ticketId,
            ticketNumber: existing.number,
            ticketTitle: existing.title,
            ticketTenantId: resolvedTenantId,
          };
          if (isRequester) {
            // Recipient is the assignee — could be local to this tenant or
            // an internal-staff member picked up from a different one.
            await this.notifyCommentRecipient(tx, recipientId, payload);
          } else {
            // Recipient is the requester — always local to this tenant.
            await this.notifications.create(
              tx,
              recipientId,
              'TICKET_COMMENT',
              payload,
            );
          }
        }
      }

      return { ...comment, author };
    });
  }

  async addAttachment(
    ticketId: string,
    commentId: string,
    file: Express.Multer.File,
    tenantIdHint?: string,
  ) {
    return this.withTicketTx(tenantIdHint, async (tx) => {
      const { userId } = getRequestContext();
      await this.assertVisible(tx, ticketId);
      const comment = await tx.ticketComment.findUnique({
        where: { id: commentId },
      });
      if (!comment || comment.ticketId !== ticketId) {
        throw new NotFoundException('Commentaire introuvable');
      }

      const storedName = `${randomUUID()}${extname(file.originalname)}`;
      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(join(UPLOADS_DIR, storedName), file.buffer);

      return tx.ticketAttachment.create({
        data: {
          ticketId,
          commentId,
          fileUrl: storedName,
          filename: file.originalname,
          uploadedBy: userId!,
        },
        select: { id: true, filename: true, createdAt: true },
      });
    });
  }

  async getAttachment(
    ticketId: string,
    attachmentId: string,
    tenantIdHint?: string,
  ) {
    return this.withTicketTx(tenantIdHint, async (tx) => {
      await this.assertVisible(tx, ticketId);
      const attachment = await tx.ticketAttachment.findUnique({
        where: { id: attachmentId },
      });
      if (!attachment || attachment.ticketId !== ticketId) {
        throw new NotFoundException('Pièce jointe introuvable');
      }
      return {
        path: join(UPLOADS_DIR, attachment.fileUrl),
        filename: attachment.filename,
      };
    });
  }

  private async assertVisible(tx: Prisma.TransactionClient, ticketId: string) {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        requesterId: true,
        assigneeId: true,
        status: true,
        number: true,
        title: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    const { roles, userId } = getRequestContext();
    if (roles?.includes(UserRole.CUSTOMER) && ticket.requesterId !== userId) {
      throw new ForbiddenException();
    }
    return ticket;
  }

  // Resolves the transaction a single-ticket action should run in. Absent (or
  // matching the caller's own tenant) → reuse the interceptor's transaction,
  // identical to pre-cross-tenant behavior. Otherwise → internal staff only,
  // a fresh transaction manually scoped to the target client tenant (same
  // pattern as AssetsService/TenantsService).
  private async withTicketTx<T>(
    tenantIdHint: string | undefined,
    fn: (tx: Prisma.TransactionClient, resolvedTenantId: string) => Promise<T>,
  ): Promise<T> {
    const { tenantId: ownTenantId } = getRequestContext();
    const targetTenantId = tenantIdHint ?? ownTenantId!;

    if (targetTenantId === ownTenantId) {
      return fn(getTenantTx(), targetTenantId);
    }

    await this.assertInternalStaff(ownTenantId!);
    await this.assertClientTenant(targetTenantId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${targetTenantId}, true)`;
      return fn(tx, targetTenantId);
    });
  }

  private async isInternalTenant(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    return tenant.type === 'INTERNAL';
  }

  private async assertInternalStaff(requesterTenantId: string) {
    if (!(await this.isInternalTenant(requesterTenantId))) {
      throw new ForbiddenException(
        'Only internal staff can access other tenants’ tickets',
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

  // Looks up users invisible under the current transaction's RLS scope (an
  // internal-staff assignee/author on a client ticket) by re-querying them
  // within the internal tenant specifically — the only other pool a ticket's
  // staff ever come from.
  private async resolveForeignUsers(
    ids: string[],
  ): Promise<Map<string, PersonRecord>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const internalTenant = await this.prisma.tenant.findFirstOrThrow({
      where: { type: 'INTERNAL' },
    });
    const users = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${internalTenant.id}, true)`;
      return tx.user.findMany({
        where: { id: { in: uniqueIds } },
        select: PERSON_SELECT,
      });
    });
    return new Map(users.map((u) => [u.id, u]));
  }

  // TICKET_ASSIGNED: the recipient is always in the *acting* staff member's
  // own tenant (self or a colleague picked from their own GET /users list).
  private async notifyOwnTenant(
    tx: Prisma.TransactionClient,
    resolvedTenantId: string,
    recipientId: string,
    type: string,
    payload: Prisma.InputJsonValue,
  ) {
    const { tenantId: ownTenantId } = getRequestContext();
    if (resolvedTenantId === ownTenantId) {
      await this.notifications.create(tx, recipientId, type, payload);
      return;
    }
    await this.prisma.$transaction(async (ownTx) => {
      await ownTx.$executeRaw`SELECT set_config('app.tenant_id', ${ownTenantId}, true)`;
      await this.notifications.create(ownTx, recipientId, type, payload);
    });
  }

  // TICKET_COMMENT recipient = existing assignee, who can be local to the
  // ticket's tenant or an internal-staff member from a different one.
  private async notifyCommentRecipient(
    tx: Prisma.TransactionClient,
    recipientId: string,
    payload: Prisma.InputJsonValue,
  ) {
    const localUser = await tx.user.findUnique({ where: { id: recipientId } });
    if (localUser) {
      await this.notifications.create(
        tx,
        recipientId,
        'TICKET_COMMENT',
        payload,
      );
      return;
    }
    const internalTenant = await this.prisma.tenant.findFirstOrThrow({
      where: { type: 'INTERNAL' },
    });
    await this.prisma.$transaction(async (internalTx) => {
      await internalTx.$executeRaw`SELECT set_config('app.tenant_id', ${internalTenant.id}, true)`;
      await this.notifications.create(
        internalTx,
        recipientId,
        'TICKET_COMMENT',
        payload,
      );
    });
  }
}
