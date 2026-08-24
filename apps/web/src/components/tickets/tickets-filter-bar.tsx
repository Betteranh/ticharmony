"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Ticket, TicketStatus } from "@/lib/types";
import { TicketsTable } from "./tickets-table";
import { NewTicketDialog } from "./new-ticket-dialog";

const STATUS_FILTERS: (TicketStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export function TicketsFilterBar({
  tickets,
  newTicketLabel,
}: {
  tickets: Ticket[];
  newTicketLabel: string;
}) {
  const t = useTranslations("tickets.status");
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);

  const filtered = useMemo(() => {
    return tickets.filter((tk) => {
      const matchesStatus = statusFilter === "ALL" || tk.status === statusFilter;
      const matchesQuery =
        query.trim() === "" ||
        tk.title.toLowerCase().includes(query.toLowerCase()) ||
        String(tk.number).includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [tickets, statusFilter, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-accent text-canvas"
                  : "border border-hairline bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              {s === "ALL" ? "Tous" : t(s)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titre ou numéro…"
              className="w-44 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            {newTicketLabel}
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <TicketsTable
          tickets={filtered}
          onSelect={(ticket) =>
            router.push(
              `/dashboard?ticket=${ticket.id}${ticket.tenant ? `&tenant=${ticket.tenant.id}` : ""}`,
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          Aucun ticket ne correspond à ces critères.
        </div>
      )}

      {showNewTicket && <NewTicketDialog onClose={() => setShowNewTicket(false)} />}
    </div>
  );
}
