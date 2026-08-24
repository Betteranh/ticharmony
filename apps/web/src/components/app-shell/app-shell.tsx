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

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        user={user}
        openTicketsCount={openTicketsCount}
        notifications={notifications}
        locale={locale}
      />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
