"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Ticket, TicketPriority, TicketStatus } from "@/lib/types";
import { TicketsTable } from "./tickets-table";

const STATUS_FILTERS: (TicketStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

const PRIORITY_FILTERS: (TicketPriority | "ALL")[] = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];

// Keeps a single page's worth of rows on screen regardless of how many
// tickets the viewer can see — client-side, over the already role-filtered
// list the server returns (consistent with the rest of this component,
// which already filters status/search client-side over one fetched array).
const PAGE_SIZE = 20;

export function TicketsFilterBar({
  tickets,
  title,
  filterBy = "status",
}: {
  tickets: Ticket[];
  title?: string;
  // The unassigned-tickets section filters by priority instead of status —
  // triaging what's up for grabs cares about urgency, not where it is in
  // the workflow (which, for something nobody has picked up, is usually
  // just OPEN anyway).
  filterBy?: "status" | "priority";
}) {
  const t = useTranslations("tickets.status");
  const tp = useTranslations("tickets.priority");
  const td = useTranslations("dashboard.pagination");
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return tickets.filter((tk) => {
      const matchesFilter =
        filterBy === "priority"
          ? priorityFilter === "ALL" || tk.priority === priorityFilter
          : // "Tous" deliberately excludes CLOSED — a closed ticket only shows
            // up once its own tab is picked, so the default view doesn't
            // accumulate every ticket ever closed.
            statusFilter === "ALL"
            ? tk.status !== "CLOSED"
            : tk.status === statusFilter;
      const matchesQuery =
        query.trim() === "" ||
        tk.title.toLowerCase().includes(query.toLowerCase()) ||
        String(tk.number).includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [tickets, statusFilter, priorityFilter, query, filterBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function setStatusFilterAndResetPage(s: TicketStatus | "ALL") {
    setStatusFilter(s);
    setPage(1);
  }

  function setPriorityFilterAndResetPage(p: TicketPriority | "ALL") {
    setPriorityFilter(p);
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
          {filterBy === "priority"
            ? PRIORITY_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilterAndResetPage(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    priorityFilter === p
                      ? "bg-accent text-canvas"
                      : "border border-hairline bg-surface text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {p === "ALL" ? "Tous" : tp(p)}
                </button>
              ))
            : STATUS_FILTERS.map((s) => (
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

        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQueryAndResetPage(e.target.value)}
            placeholder="Titre ou numéro…"
            className="w-44 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
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
    </div>
  );
}
