import { TopNav } from "./top-nav";
import type { Person } from "@/lib/types";
import { listTickets } from "@/lib/tickets";
import { listNotifications } from "@/lib/notifications";

export async function AppShell({
  user,
  locale,
  children,
}: {
  user: Person;
  locale: string;
  children: React.ReactNode;
}) {
  const [tickets, notifications] = await Promise.all([
    listTickets(locale),
    listNotifications(),
  ]);
  const openTicketsCount = tickets.filter(
    (tk) => tk.status !== "RESOLVED" && tk.status !== "CLOSED",
  ).length;
  // "Worked on" has no dedicated tracking (no assignment-history audit trail —
  // see DECISIONS.md) — approximated as closed tickets where this user is
  // the current assignee (staff) or the requester (customer, their own past
  // requests). Sorted most-recently-closed first via updatedAt, the closest
  // proxy available since closedAt isn't exposed to the frontend.
  const closedTicketHistory = tickets
    .filter(
      (tk) =>
        tk.status === "CLOSED" && (tk.assignee?.id === user.id || tk.requester.id === user.id),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        user={user}
        openTicketsCount={openTicketsCount}
        notifications={notifications}
        ticketHistory={closedTicketHistory}
        locale={locale}
      />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
