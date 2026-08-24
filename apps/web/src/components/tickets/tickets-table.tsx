"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Ticket } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/format";

export function TicketsTable({
  tickets,
  onSelect,
}: {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
}) {
  const t = useTranslations("tickets.columns");
  const locale = useLocale();
  const showCompany = tickets.some((ticket) => ticket.tenant);

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <th className="px-5 py-3 font-mono">{t("number")}</th>
            <th className="px-3 py-3">{t("title")}</th>
            {showCompany && <th className="px-3 py-3">{t("company")}</th>}
            <th className="px-3 py-3">{t("requester")}</th>
            <th className="px-3 py-3">{t("assignee")}</th>
            <th className="px-3 py-3">{t("status")}</th>
            <th className="px-3 py-3">{t("priority")}</th>
            <th className="px-5 py-3 text-right">{t("updatedAt")}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, i) => (
            <tr
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              className="animate-rise-in cursor-pointer border-b border-hairline last:border-0 transition-colors hover:bg-surface-hover"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <td className="px-5 py-3.5 font-mono text-text-tertiary">#{ticket.number}</td>
              <td className="px-3 py-3.5">
                <span className="font-medium text-text-primary">{ticket.title}</span>
              </td>
              {showCompany && (
                <td className="px-3 py-3.5 text-text-secondary">{ticket.tenant?.name ?? "—"}</td>
              )}
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-2">
                  <Avatar person={ticket.requester} size="sm" />
                  <span className="text-text-secondary">
                    {ticket.requester.firstName} {ticket.requester.lastName}
                  </span>
                </div>
              </td>
              <td className="px-3 py-3.5">
                {ticket.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar person={ticket.assignee} size="sm" />
                    <span className="text-text-secondary">{ticket.assignee.firstName}</span>
                  </div>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="px-3 py-3.5">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-3 py-3.5">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-5 py-3.5 text-right font-mono text-xs text-text-tertiary">
                {relativeTime(ticket.updatedAt, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
