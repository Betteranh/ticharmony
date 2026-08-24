import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { getRequestContext, getTenantTx } from '../../common/tenant-context';

@Injectable()
export class NotificationsService {
  // Called from other services (e.g. TicketsService) for a recipient that
  // isn't necessarily the requester. The caller must pass the transaction
  // already scoped (via app.tenant_id) to the recipient's own tenant — RLS
  // (tenant_isolation_notifications) rejects the insert otherwise. Ticket
  // recipients can live in a different tenant than the ticket itself (an
  // internal-staff assignee on a client's ticket), so callers can no longer
  // assume "the current request's tenant" is always correct here.
  create(
    tx: Prisma.TransactionClient,
    userId: string,
    type: string,
    payload: Prisma.InputJsonValue,
  ) {
    return tx.notification.create({
      data: { userId, type, channel: 'IN_APP', payload },
    });
  }

  findForUser() {
    const { userId } = getRequestContext();
    return getTenantTx().notification.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async markRead(id: string) {
    const { userId } = getRequestContext();
    const notification = await getTenantTx().notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification introuvable');
    }
    return getTenantTx().notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead() {
    const { userId } = getRequestContext();
    await getTenantTx().notification.updateMany({
      where: { userId: userId!, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
