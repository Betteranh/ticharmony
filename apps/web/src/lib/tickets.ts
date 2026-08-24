import { apiFetch } from "@/lib/api";
import type { Person, Ticket, TicketComment } from "@/lib/types";

interface ApiPerson {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  roles: Person["roles"];
  email: string;
  department: string | null;
  location: string | null;
  phone: string | null;
}

interface ApiCategory {
  id: string;
  nameFr: string;
  nameEn: string;
}

interface ApiAttachment {
  id: string;
  filename: string;
  createdAt: string;
}

interface ApiComment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: ApiPerson;
  attachments?: ApiAttachment[];
}

interface ApiTenant {
  id: string;
  name: string;
  slug: string;
}

interface ApiTicket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: Ticket["status"];
  priority: Ticket["priority"];
  createdAt: string;
  updatedAt: string;
  requester: ApiPerson;
  assignee: ApiPerson | null;
  category: ApiCategory | null;
  comments?: ApiComment[];
  tenant?: ApiTenant;
  tenantAddress?: string | null;
}

function mapComment(comment: ApiComment): TicketComment {
  return {
    id: comment.id,
    author: comment.author,
    body: comment.body,
    isInternal: comment.isInternal,
    createdAt: comment.createdAt,
    attachments: comment.attachments ?? [],
  };
}

function mapTicket(ticket: ApiTicket, locale: string): Ticket {
  return {
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    requester: ticket.requester,
    assignee: ticket.assignee,
    category: ticket.category ? (locale === "fr" ? ticket.category.nameFr : ticket.category.nameEn) : null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    comments: (ticket.comments ?? []).map(mapComment),
    tenant: ticket.tenant,
    tenantAddress: ticket.tenantAddress,
  };
}

export async function listTickets(locale: string): Promise<Ticket[]> {
  const tickets = await apiFetch<ApiTicket[]>("/tickets");
  return tickets.map((t) => mapTicket(t, locale));
}

export async function getTicket(id: string, locale: string, tenantId?: string): Promise<Ticket> {
  const query = tenantId ? `?tenantId=${tenantId}` : "";
  const ticket = await apiFetch<ApiTicket>(`/tickets/${id}${query}`);
  return mapTicket(ticket, locale);
}