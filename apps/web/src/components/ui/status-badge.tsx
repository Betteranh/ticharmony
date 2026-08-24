import { useTranslations } from "next-intl";
import type { TicketStatus } from "@/lib/types";

const STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: "bg-status-open",
  IN_PROGRESS: "bg-status-in-progress",
  PENDING_CUSTOMER: "bg-status-pending",
  RESOLVED: "bg-status-resolved",
  CLOSED: "bg-status-closed",
  REOPENED: "bg-status-reopened",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const t = useTranslations("tickets.status");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {t(status)}
    </span>
  );
}
