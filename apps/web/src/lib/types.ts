export type UserRole = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "CUSTOMER";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type DirectoryUserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export interface ClientTenant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  companyNumber: string | null;
  active: boolean;
  userCount: number;
  createdAt: string;
}

export interface UserLicense {
  id: string;
  name: string;
  email: string;
  password: string;
  updatedAt: string;
}

export interface DirectoryUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  department: string | null;
  phone: string | null;
  employeeCode: string | null;
  roles: UserRole[];
  status: DirectoryUserStatus;
  createdAt: string;
  licenses: UserLicense[];
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  roles: UserRole[];
  status: DirectoryUserStatus;
  createdAt: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  roles: UserRole[];
  email?: string;
  department?: string | null;
  location?: string | null;
  phone?: string | null;
  tenantType?: "INTERNAL" | "CLIENT";
}

export interface TicketAttachment {
  id: string;
  filename: string;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  author: Person;
  body: string;
  isInternal: boolean;
  createdAt: string;
  attachments: TicketAttachment[];
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  articleCount: number;
}

export type ArticleVisibility = "INTERNAL" | "PUBLIC";

export interface KnowledgeArticle {
  id: string;
  categoryId: string | null;
  title: string;
  body: string;
  visibility: ArticleVisibility;
  updatedAt: string;
}

export type AssetType = "LAPTOP" | "DESKTOP" | "SWITCH" | "ROUTER" | "SERVER" | "PRINTER" | "OTHER";

export type AssetStatus = "DEPLOYED" | "IN_STOCK" | "DISABLED" | "RETIRED";

export interface AssetNote {
  id: string;
  label: string;
  value: string;
  sensitive: boolean;
  updatedAt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  type: AssetType;
  model: string;
  status: AssetStatus;
  location: string | null;
  serialNumber: string | null;
  assignee: Person | null;
  notes: AssetNote[];
  updatedAt: string;
}

export type NotificationType = "TICKET_ASSIGNED" | "TICKET_RESOLVED" | "TICKET_COMMENT";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  payload: {
    ticketId: string;
    ticketNumber: number;
    ticketTitle: string;
    ticketTenantId?: string;
  };
  readAt: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: Person;
  assignee: Person | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
  // Only present in the aggregated multi-client queue seen by internal staff.
  tenant?: { id: string; name: string; slug: string };
  // The ticket's own tenant's registered address (set at company creation),
  // shown in the "Reported by" block regardless of viewer.
  tenantAddress?: string | null;
}
