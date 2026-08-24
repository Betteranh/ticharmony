import { useTranslations } from "next-intl";
import type { TicketPriority } from "@/lib/types";

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  LOW: "text-priority-low border-hairline-strong",
  MEDIUM: "text-priority-medium border-priority-medium/30 bg-priority-medium/10",
  HIGH: "text-priority-high border-priority-high/30 bg-priority-high/10",
  URGENT: "text-priority-urgent border-priority-urgent/40 bg-priority-urgent/10",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const t = useTranslations("tickets.priority");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono font-medium uppercase tracking-wider whitespace-nowrap ${PRIORITY_STYLE[priority]}`}
    >
      {priority === "URGENT" && (
        <span className="h-1.5 w-1.5 rounded-full bg-priority-urgent animate-pulse-dot" />
      )}
      {t(priority)}
    </span>
  );
}
