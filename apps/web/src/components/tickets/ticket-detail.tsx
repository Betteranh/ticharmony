"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Lock,
  MoreHorizontal,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Person, Ticket } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/format";

const STATUS_OPTIONS: Ticket["status"][] = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];
const PRIORITY_OPTIONS: Ticket["priority"][] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_PILL: Record<Ticket["status"], string> = {
  OPEN: "border-hairline bg-surface-raised text-text-primary",
  IN_PROGRESS: "border-hairline bg-surface-raised text-text-primary",
  PENDING_CUSTOMER: "border-hairline bg-surface-raised text-text-primary",
  RESOLVED: "border-hairline bg-surface-raised text-text-primary",
  CLOSED: "border-hairline bg-surface-raised text-text-primary",
  REOPENED: "border-status-reopened/30 bg-status-reopened/10 text-status-reopened",
};

const PRIORITY_PILL: Record<Ticket["priority"], string> = {
  LOW: "text-priority-low border-hairline-strong",
  MEDIUM: "text-priority-medium border-priority-medium/30 bg-priority-medium/10",
  HIGH: "text-priority-high border-priority-high/30 bg-priority-high/10",
  URGENT: "text-priority-urgent border-priority-urgent/40 bg-priority-urgent/10",
};

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onOutside]);
  return ref;
}

export function TicketDetail({
  ticket,
  currentUser,
  technicians,
}: {
  ticket: Ticket;
  currentUser: Person;
  technicians: Person[];
}) {
  const t = useTranslations("tickets");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const isStaff =
    currentUser.roles.includes("AGENT") ||
    currentUser.roles.includes("ADMIN") ||
    currentUser.roles.includes("SUPER_ADMIN");
  const isManager = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isAssignedToMe = ticket.assignee?.id === currentUser.id;

  const [internalNote, setInternalNote] = useState(false);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useClickOutside(() => setOptionsOpen(false));

  // Manager reassignment, status and priority changes all apply only on
  // explicit confirmation, not on every <select> change, to avoid an
  // accidental change from a stray click. Each is resynced during render
  // (not an effect) when the ticket's actual value changes — either from
  // switching tickets or a confirmed change coming back through the props.
  const assigneeKey = `${ticket.id}:${ticket.assignee?.id ?? ""}`;
  const [syncedAssigneeKey, setSyncedAssigneeKey] = useState(assigneeKey);
  const [pendingAssigneeId, setPendingAssigneeId] = useState(ticket.assignee?.id ?? "");
  if (syncedAssigneeKey !== assigneeKey) {
    setSyncedAssigneeKey(assigneeKey);
    setPendingAssigneeId(ticket.assignee?.id ?? "");
  }

  const statusKey = `${ticket.id}:${ticket.status}`;
  const [syncedStatusKey, setSyncedStatusKey] = useState(statusKey);
  const [pendingStatus, setPendingStatus] = useState<Ticket["status"]>(ticket.status);
  if (syncedStatusKey !== statusKey) {
    setSyncedStatusKey(statusKey);
    setPendingStatus(ticket.status);
  }

  const priorityKey = `${ticket.id}:${ticket.priority}`;
  const [syncedPriorityKey, setSyncedPriorityKey] = useState(priorityKey);
  const [pendingPriority, setPendingPriority] = useState<Ticket["priority"]>(ticket.priority);
  if (syncedPriorityKey !== priorityKey) {
    setSyncedPriorityKey(priorityKey);
    setPendingPriority(ticket.priority);
  }

  // Present only when internal staff is acting on a client company's ticket
  // from the aggregated queue — carried through every action on this ticket.
  const tenantQuery = ticket.tenant ? `?tenantId=${ticket.tenant.id}` : "";

  async function patchTicket(body: Record<string, string | null>) {
    await fetch(`/api/tickets/${ticket.id}${tenantQuery}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function submitComment() {
    if (!draft.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/tickets/${ticket.id}/comments${tenantQuery}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft, isInternal: internalNote }),
    });

    if (res.ok && file) {
      const comment = await res.json();
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`/api/tickets/${ticket.id}/comments/${comment.id}/attachments${tenantQuery}`, {
        method: "POST",
        body: formData,
      });
    }

    setDraft("");
    setFile(null);
    setSubmitting(false);
    router.refresh();
  }

  // Plain, print-style document — deliberately undesigned (no brand colors/
  // layout beyond simple headings). Public-only export is safe to hand to
  // anyone regardless of who exported it; the with-internal-notes variant
  // is only ever offered to staff (see the menu below) — a CUSTOMER's own
  // `ticket.comments` never contains internal notes in the first place,
  // filtered server-side (see TicketsService.findOne).
  async function exportToPdf(includeInternal: boolean) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginX * 2;
    let y = 56;

    function write(text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) {
      const { size = 10, bold = false, gap = 14 } = opts;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines: string[] = doc.splitTextToSize(text, maxWidth);
      if (y + lines.length * gap > pageHeight - 48) {
        doc.addPage();
        y = 56;
      }
      doc.text(lines, marginX, y);
      y += lines.length * gap;
    }

    write(`#${ticket.number}`, { size: 9, gap: 12 });
    write(ticket.title, { size: 16, bold: true, gap: 20 });
    y += 4;
    write(`${t(`status.${ticket.status}`)}  ·  ${t(`priority.${ticket.priority}`)}`);
    if (ticket.category) write(`${t("export.category")}: ${ticket.category}`);
    y += 8;

    write(
      `${t("reportedBy")}: ${ticket.requester.firstName} ${ticket.requester.lastName}` +
        (ticket.requester.email ? ` (${ticket.requester.email})` : ""),
    );
    write(new Date(ticket.createdAt).toLocaleString(locale), { size: 9 });
    if (ticket.tenantAddress) write(`${t("address")}: ${ticket.tenantAddress}`);
    if (ticket.requester.department) write(`${t("department")}: ${ticket.requester.department}`);
    if (ticket.requester.location) write(`${t("location")}: ${ticket.requester.location}`);
    if (ticket.requester.phone) write(`${t("contact")}: ${ticket.requester.phone}`);
    y += 8;

    write(t("issueDescription"), { bold: true });
    write(ticket.description);
    y += 12;

    const commentsToExport = includeInternal
      ? ticket.comments
      : ticket.comments.filter((c) => !c.isInternal);
    write(`${t("export.comments")} (${commentsToExport.length})`, { bold: true, size: 12 });
    y += 4;
    if (commentsToExport.length === 0) {
      write(t(includeInternal ? "export.noCommentsAny" : "export.noComments"), { size: 9 });
    } else {
      for (const comment of commentsToExport) {
        write(
          `${comment.author.firstName} ${comment.author.lastName} — ${new Date(comment.createdAt).toLocaleString(locale)}` +
            (comment.isInternal ? `  [${t("export.internalNote")}]` : ""),
          { bold: true, size: 9 },
        );
        write(comment.body, { size: 10 });
        if (comment.attachments.length > 0) {
          write(
            `${t("export.attachments")}: ${comment.attachments.map((a) => a.filename).join(", ")}`,
            { size: 8 },
          );
        }
        y += 10;
      }
    }

    doc.save(includeInternal ? `ticket-${ticket.number}-complet.pdf` : `ticket-${ticket.number}.pdf`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tn("dashboard")}
        </Link>

        {/* Header card */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-text-tertiary">
              <span>#{ticket.number}</span>
              <span>·</span>
              <span>{ticket.category}</span>
              {ticket.tenant && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 font-sans text-accent">
                  {ticket.tenant.name}
                </span>
              )}
            </div>

            <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setOptionsOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                {t("options")}
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
              </button>
              {optionsOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-10 w-56 overflow-hidden rounded-lg border border-hairline bg-surface shadow-xl shadow-black/40">
                  <button
                    onClick={() => {
                      setOptionsOpen(false);
                      exportToPdf(false);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("export.menuLabel")}
                  </button>
                  {/* Only staff can ever export internal notes — a CUSTOMER's
                      own ticket.comments never contains them in the first
                      place (filtered server-side), so the option would be
                      pointless (and confusing) to show them. */}
                  {isStaff && (
                    <button
                      onClick={() => {
                        setOptionsOpen(false);
                        exportToPdf(true);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {t("export.menuLabelWithInternal")}
                    </button>
                  )}
                  {isStaff && (
                    <button
                      onClick={() => {
                        setOptionsOpen(false);
                        patchTicket({ status: ticket.status === "CLOSED" ? "REOPENED" : "CLOSED" });
                      }}
                      className="flex w-full items-center px-3.5 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                    >
                      {ticket.status === "CLOSED" ? t("reopenTicket") : t("closeTicket")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
            {ticket.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isStaff ? (
              <select
                value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value as Ticket["status"])}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus:border-accent/60 ${STATUS_PILL[pendingStatus]}`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            ) : (
              <StatusBadge status={ticket.status} />
            )}
            {isStaff && pendingStatus !== ticket.status && (
              <button
                onClick={() => patchTicket({ status: pendingStatus })}
                className="text-xs font-medium text-accent hover:text-accent-strong"
              >
                {t("confirm")}
              </button>
            )}
            {isStaff ? (
              <select
                value={pendingPriority}
                onChange={(e) => setPendingPriority(e.target.value as Ticket["priority"])}
                className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] font-mono font-medium uppercase tracking-wider outline-none focus:border-accent/60 ${PRIORITY_PILL[pendingPriority]}`}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {t(`priority.${p}`)}
                  </option>
                ))}
              </select>
            ) : (
              <PriorityBadge priority={ticket.priority} />
            )}
            {isStaff && pendingPriority !== ticket.priority && (
              <button
                onClick={() => patchTicket({ priority: pendingPriority })}
                className="text-xs font-medium text-accent hover:text-accent-strong"
              >
                {t("confirm")}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="text-xs uppercase tracking-wider text-text-tertiary">
              {t("columns.assignee")}
            </span>
            {isManager ? (
              <>
                <select
                  value={pendingAssigneeId}
                  onChange={(e) => setPendingAssigneeId(e.target.value)}
                  className="rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent/60"
                >
                  <option value="">{t("unassigned")}</option>
                  <option value={currentUser.id}>
                    {t("me")} — {currentUser.firstName} {currentUser.lastName}
                  </option>
                  {technicians
                    .filter((tech) => tech.id !== currentUser.id)
                    .map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName}
                      </option>
                    ))}
                </select>
                {pendingAssigneeId !== (ticket.assignee?.id ?? "") && (
                  <button
                    onClick={() => patchTicket({ assigneeId: pendingAssigneeId || null })}
                    className="text-xs font-medium text-accent hover:text-accent-strong"
                  >
                    {t("confirm")}
                  </button>
                )}
              </>
            ) : ticket.assignee ? (
              <span className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-raised py-0.5 pl-1 pr-2.5 text-xs text-text-primary">
                <Avatar person={ticket.assignee} size="sm" />
                {ticket.assignee.firstName} {ticket.assignee.lastName}
              </span>
            ) : (
              <span className="rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs text-text-tertiary">
                {t("unassigned")}
              </span>
            )}
            {!isManager && isStaff && (
              <button
                onClick={() =>
                  patchTicket({ assigneeId: isAssignedToMe ? null : currentUser.id })
                }
                className="text-xs font-medium text-accent hover:text-accent-strong"
              >
                {isAssignedToMe ? t("unassign") : t("assignToMe")}
              </button>
            )}
          </div>

          <div className="my-4 border-t border-hairline" />

          <div className="rounded-lg border border-hairline bg-surface-raised/50 p-4 text-sm">
            <p className="text-text-secondary">
              <span className="text-text-tertiary">{t("reportedBy")}: </span>
              <span className="text-text-primary">
                {ticket.requester.firstName} {ticket.requester.lastName}
              </span>
              {ticket.requester.email && (
                <span className="text-text-tertiary"> ({ticket.requester.email})</span>
              )}
              <span className="text-text-tertiary"> · {relativeTime(ticket.createdAt, locale)}</span>
            </p>
            {ticket.tenantAddress && (
              <p className="mt-1 text-text-secondary">
                <span className="text-text-tertiary">{t("address")}: </span>
                {ticket.tenantAddress}
              </p>
            )}
            {(ticket.requester.department || ticket.requester.location) && (
              <p className="mt-1 text-text-secondary">
                {ticket.requester.department && (
                  <>
                    <span className="text-text-tertiary">{t("department")}: </span>
                    {ticket.requester.department}
                  </>
                )}
                {ticket.requester.department && ticket.requester.location && (
                  <span className="text-text-tertiary"> | </span>
                )}
                {ticket.requester.location && (
                  <>
                    <span className="text-text-tertiary">{t("location")}: </span>
                    {ticket.requester.location}
                  </>
                )}
              </p>
            )}
            {ticket.requester.phone && (
              <p className="mt-1 text-text-secondary">
                <span className="text-text-tertiary">{t("contact")}: </span>
                {ticket.requester.phone}
              </p>
            )}
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              {t("issueDescription")}
            </p>
            <p className="mt-1 leading-relaxed text-text-primary">{ticket.description}</p>
          </div>
        </div>

        {/* Conversation thread */}
        <div className="flex flex-col gap-3">
          {ticket.comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-xl border p-4 ${
                comment.isInternal
                  ? "border-status-reopened/30 bg-status-reopened/[0.06]"
                  : "border-hairline bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar person={comment.author} size="sm" />
                  <span className="text-sm font-medium text-text-primary">
                    {comment.author.firstName} {comment.author.lastName}
                  </span>
                  {comment.isInternal && (
                    <span className="flex items-center gap-1 rounded-full bg-status-reopened/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-status-reopened">
                      <Lock className="h-2.5 w-2.5" />
                      Note interne
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-text-tertiary">
                  {relativeTime(comment.createdAt, locale)}
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">{comment.body}</p>
              {comment.attachments.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {comment.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/tickets/${ticket.id}/attachments/${attachment.id}${tenantQuery}`}
                      className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary"
                    >
                      <FileText className="h-3 w-3" strokeWidth={1.75} />
                      {attachment.filename}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {ticket.comments.length === 0 && (
            <div className="rounded-xl border border-dashed border-hairline-strong py-10 text-center text-sm text-text-tertiary">
              Aucun échange pour le moment.
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Écrire une réponse…"
            className="w-full resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {file && (
            <div className="mb-3 flex items-center gap-1.5 self-start rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs text-text-secondary">
              <FileText className="h-3 w-3" strokeWidth={1.75} />
              {file.name}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-text-tertiary hover:text-priority-urgent"
              >
                <X className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isStaff && (
                <button
                  onClick={() => setInternalNote((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    internalNote
                      ? "bg-status-reopened/15 text-status-reopened"
                      : "border border-hairline text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Lock className="h-3 w-3" />
                  Note interne
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t("attachFile")}
                className="rounded-full border border-hairline p-1.5 text-text-tertiary transition-colors hover:border-accent/60 hover:text-text-primary"
              >
                <Paperclip className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <button
              onClick={submitComment}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
              disabled={!draft.trim() || submitting}
            >
              Envoyer
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
