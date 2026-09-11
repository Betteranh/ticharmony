"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
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

// Keeps a single page's worth of rows on screen regardless of how many
// tickets the viewer can see — client-side, over the already role-filtered
// list the server returns (consistent with the rest of this component,
// which already filters status/search client-side over one fetched array).
const PAGE_SIZE = 20;

export function TicketsFilterBar({
  tickets,
  newTicketLabel,
  title,
  showNewTicketButton = true,
}: {
  tickets: Ticket[];
  newTicketLabel: string;
  title?: string;
  showNewTicketButton?: boolean;
}) {
  const t = useTranslations("tickets.status");
  const td = useTranslations("dashboard.pagination");
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showNewTicket, setShowNewTicket] = useState(false);

  const filtered = useMemo(() => {
    return tickets.filter((tk) => {
      // "Tous" deliberately excludes CLOSED — a closed ticket only shows up
      // once its own tab is picked, so the default view doesn't accumulate
      // every ticket ever closed.
      const matchesStatus =
        statusFilter === "ALL" ? tk.status !== "CLOSED" : tk.status === statusFilter;
      const matchesQuery =
        query.trim() === "" ||
        tk.title.toLowerCase().includes(query.toLowerCase()) ||
        String(tk.number).includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [tickets, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function setStatusFilterAndResetPage(s: TicketStatus | "ALL") {
    setStatusFilter(s);
    setPage(1);
  }

  function setQueryAndResetPage(q: string) {
    setQuery(q);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {title} <span className="text-text-primary">({filtered.length})</span>
        </h2>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilterAndResetPage(s)}
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
              onChange={(e) => setQueryAndResetPage(e.target.value)}
              placeholder="Titre ou numéro…"
              className="w-44 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          {showNewTicketButton && (
            <button
              onClick={() => setShowNewTicket(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              {newTicketLabel}
            </button>
          )}
        </div>
      </div>

      {paged.length > 0 ? (
        <>
          <TicketsTable
            tickets={paged}
            onSelect={(ticket) =>
              router.push(
                `/dashboard?ticket=${ticket.id}${ticket.tenant ? `&tenant=${ticket.tenant.id}` : ""}`,
              )
            }
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                {td("previous")}
              </button>
              <span className="font-mono text-xs text-text-tertiary">
                {td("page", { page: currentPage, total: totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {td("next")}
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          Aucun ticket ne correspond à ces critères.
        </div>
      )}

      {showNewTicket && <NewTicketDialog onClose={() => setShowNewTicket(false)} />}
    </div>
  );
}
