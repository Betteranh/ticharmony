"use client";

import { useRouter } from "@/i18n/navigation";
import type { Ticket } from "@/lib/types";
import { TicketsTable } from "./tickets-table";

export function MyQueueSection({
  tickets,
  title,
  emptyLabel,
}: {
  tickets: Ticket[];
  title: string;
  emptyLabel: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {title} <span className="text-text-primary">({tickets.length})</span>
      </h2>
      {tickets.length > 0 ? (
        <TicketsTable
          tickets={tickets}
          onSelect={(ticket) =>
            router.push(
              `/dashboard?ticket=${ticket.id}${ticket.tenant ? `&tenant=${ticket.tenant.id}` : ""}`,
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-8 text-center text-sm text-text-tertiary">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
