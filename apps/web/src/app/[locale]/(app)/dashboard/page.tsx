import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getTicket, listTickets } from "@/lib/tickets";
import { listUsers } from "@/lib/users";
import type { UserRole } from "@/lib/types";
import { TicketsFilterBar } from "@/components/tickets/tickets-filter-bar";
import { TicketDetail } from "@/components/tickets/ticket-detail";

const STAFF_ROLES: UserRole[] = ["AGENT", "ADMIN", "SUPER_ADMIN"];

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ticket?: string; tenant?: string }>;
}) {
  const { locale } = await params;
  const { ticket: selectedTicketId, tenant: selectedTenantId } = await searchParams;

  const [t, tt, currentUser, tickets] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("tickets"),
    getSession(),
    listTickets(locale),
  ]);

  // AppLayout already redirects unauthenticated users to /login before rendering
  // this page — a null session here only happens if the token expired mid-request.
  if (!currentUser) {
    redirect({ href: "/login", locale });
  }

  const isStaff = STAFF_ROLES.some((role) => currentUser!.roles.includes(role));
  const technicians = isStaff
    ? (await listUsers()).filter((u) => STAFF_ROLES.some((role) => u.roles.includes(role)))
    : [];

  if (selectedTicketId) {
    let ticket;
    try {
      ticket = await getTicket(selectedTicketId, locale, selectedTenantId);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        redirect({ href: "/dashboard", locale });
      }
      throw err;
    }
    return <TicketDetail ticket={ticket} currentUser={currentUser!} technicians={technicians} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
        {t("title")}
      </h1>

      <TicketsFilterBar tickets={tickets} newTicketLabel={tt("newTicket")} />
    </div>
  );
}
