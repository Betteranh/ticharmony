"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Ticket as TicketIcon,
  LayoutDashboard,
  BookOpen,
  Bell,
  Boxes,
  Users as UsersIcon,
  Search,
  Settings,
  LogOut,
  BarChart3,
  Award,
  History,
  LifeBuoy,
  Network,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { NotificationItem, Person, Ticket } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Modal } from "@/components/ui/modal";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { relativeTime } from "@/lib/format";

// Points/leaderboard/achievements/analytics are a gamification system not
// yet implemented (no scoring logic, no backend) — UI kept in the code,
// just hidden until it's actually built. Flip this flag to bring it back.
// See DECISIONS.md / SPEC.md ("Système de points").
const POINTS_SYSTEM_ENABLED = false;

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onOutside]);
  return ref;
}

export function TopNav({
  user,
  openTicketsCount,
  notifications,
  ticketHistory,
  locale,
}: {
  user: Person;
  openTicketsCount: number;
  notifications: NotificationItem[];
  ticketHistory: Ticket[];
  locale: string;
}) {
  const t = useTranslations("nav");
  const tt = useTranslations("nav.tools");
  const tu = useTranslations("nav.userMenu");
  const tl = useTranslations("nav.leaderboard");
  const th = useTranslations("nav.history");
  const td = useTranslations("dashboard.pagination");
  const tn = useTranslations("notifications");
  const tc = useTranslations("common");
  const router = useRouter();

  const [toolsOpen, setToolsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState(notifications);
  const [signingOut, setSigningOut] = useState(false);
  const userRef = useClickOutside(() => setUserOpen(false));
  const notifRef = useClickOutside(() => setNotifOpen(false));
  const unreadCount = notifItems.filter((n) => !n.readAt).length;

  // A modal-sized list, not a full page — 10/page keeps it from feeling
  // cramped inside the fixed-height Modal.
  const HISTORY_PAGE_SIZE = 10;
  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return ticketHistory;
    return ticketHistory.filter(
      (tk) => tk.title.toLowerCase().includes(q) || String(tk.number).includes(q),
    );
  }, [ticketHistory, historyQuery]);
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = filteredHistory.slice(
    (historyCurrentPage - 1) * HISTORY_PAGE_SIZE,
    historyCurrentPage * HISTORY_PAGE_SIZE,
  );

  function goToTicket(ticket: Ticket) {
    setHistoryOpen(false);
    router.push(`/dashboard?ticket=${ticket.id}${ticket.tenant ? `&tenant=${ticket.tenant.id}` : ""}`);
  }

  async function handleNotificationClick(item: NotificationItem) {
    setNotifOpen(false);
    if (!item.readAt) {
      setNotifItems((items) =>
        items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
      );
      await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
    }
    const tenantQuery = item.payload.ticketTenantId
      ? `&tenant=${item.payload.ticketTenantId}`
      : "";
    router.push(`/dashboard?ticket=${item.payload.ticketId}${tenantQuery}`);
  }

  async function markAllNotificationsRead() {
    setNotifItems((items) => items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  const isAdmin = user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN");
  // Directory, Knowledge Base and Assets management are internal-staff tools —
  // client companies (any role, including their own ADMIN) only get their
  // dashboard/tickets and their own employee list (/users).
  const isInternalStaff = user.tenantType === "INTERNAL";

  const toolGroups = [
    {
      label: tt("groups.workspace"),
      items: [{ href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard }],
    },
    ...(isInternalStaff
      ? [
          {
            label: tt("groups.infrastructure"),
            items: [{ href: "/directory", label: t("activeDirectory"), icon: Network }],
          },
        ]
      : []),
    ...(isInternalStaff
      ? [
          {
            label: tt("groups.knowledge"),
            items: [{ href: "/knowledge-base", label: t("knowledgeBase"), icon: BookOpen }],
          },
        ]
      : []),
    {
      label: tt("groups.management"),
      items: [
        ...(isAdmin ? [{ href: "/users", label: t("users"), icon: UsersIcon }] : []),
        ...(isInternalStaff ? [{ href: "/assets", label: t("assets"), icon: Boxes }] : []),
        { href: "/settings", label: t("settings"), icon: Settings },
      ],
    },
  ];

  return (
    <header className="relative z-30 flex h-16 flex-none items-center gap-4 border-b border-hairline bg-canvas/80 px-4 backdrop-blur-sm sm:px-6">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <Image
          src="/brand/tic-harmony-logo.png"
          alt="TIC Harmony"
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
        <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:inline">
          TIC<span className="text-accent">Harmony</span>
        </span>
      </Link>

      <button
        onClick={() => setToolsOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        <Wrench className="h-4 w-4" strokeWidth={1.75} />
        {t("toolsTrigger")}
      </button>

      {toolsOpen && (
        <Modal
          icon={<Wrench className="h-4 w-4 text-accent" strokeWidth={1.75} />}
          title={t("toolsTrigger")}
          onClose={() => setToolsOpen(false)}
        >
          {toolGroups.map((group) => (
            <div key={group.label} className="border-b border-hairline py-2 last:border-0">
              <p className="px-5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setToolsOpen(false)}
                    className="flex items-center gap-3 px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                  >
                    <Icon className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </Modal>
      )}

      <div className="flex-1" />

      {POINTS_SYSTEM_ENABLED && (
        <button
          onClick={() => setLeaderboardOpen(true)}
          className="hidden items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm text-text-tertiary transition-colors hover:border-hairline-strong hover:text-text-primary sm:flex"
        >
          <Trophy className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="font-mono text-xs">—</span>
          <span className="text-[10px] uppercase tracking-wider">{t("points")}</span>
        </button>
      )}

      {POINTS_SYSTEM_ENABLED && leaderboardOpen && (
        <Modal
          icon={<Trophy className="h-4 w-4 text-accent" strokeWidth={1.75} />}
          title={tl("title")}
          badge={tl("badge")}
          onClose={() => setLeaderboardOpen(false)}
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-raised px-5 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar person={user} size="sm" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  {tl("rookie")}
                </p>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold text-accent">—</span>
          </div>
          <div className="flex items-center justify-between px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            <span>{tl("user")}</span>
            <span>{tl("score")}</span>
          </div>
          <p className="px-5 py-8 text-center text-sm text-text-tertiary">{tl("comingSoon")}</p>
        </Modal>
      )}

      {historyOpen && (
        <Modal
          icon={<History className="h-4 w-4 text-accent" strokeWidth={1.75} />}
          title={th("title")}
          badge={String(ticketHistory.length)}
          onClose={() => setHistoryOpen(false)}
        >
          {ticketHistory.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-tertiary">{th("empty")}</p>
          ) : (
            <>
              <div className="sticky top-0 z-10 border-b border-hairline bg-surface px-5 py-2.5">
                <div className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-1.5">
                  <Search className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.75} />
                  <input
                    value={historyQuery}
                    onChange={(e) => {
                      setHistoryQuery(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder="Titre ou numéro…"
                    className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
              </div>

              {pagedHistory.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-text-tertiary">
                  {th("noResults")}
                </p>
              ) : (
                pagedHistory.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => goToTicket(ticket)}
                    className="flex w-full flex-col gap-0.5 border-b border-hairline px-5 py-3 text-left transition-colors last:border-0 hover:bg-surface-raised"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-text-primary">
                        #{ticket.number} {ticket.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                        {relativeTime(ticket.updatedAt, locale)}
                      </span>
                    </div>
                    {ticket.tenant && (
                      <span className="text-xs text-text-tertiary">{ticket.tenant.name}</span>
                    )}
                  </button>
                ))
              )}

              {historyTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 border-t border-hairline py-3">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyCurrentPage === 1}
                    className="flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {td("previous")}
                  </button>
                  <span className="font-mono text-xs text-text-tertiary">
                    {td("page", { page: historyCurrentPage, total: historyTotalPages })}
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyCurrentPage === historyTotalPages}
                    className="flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {td("next")}
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      <div className="group relative">
        <Link
          href="/dashboard"
          className="relative flex rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <TicketIcon className="h-4 w-4" strokeWidth={1.75} />
          {openTicketsCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 font-mono text-[9px] font-semibold text-canvas">
              {openTicketsCount > 99 ? "99+" : openTicketsCount}
            </span>
          )}
        </Link>
        <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 whitespace-nowrap rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-text-secondary opacity-0 shadow-lg shadow-black/30 transition-opacity group-hover:opacity-100">
          <span className="font-mono">{openTicketsCount}</span> {t("ticketsRemaining")}
        </div>
      </div>

      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative flex rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 font-mono text-[9px] font-semibold text-canvas">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 animate-rise-in overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
              <span className="text-sm font-semibold text-text-primary">{tn("title")}</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs font-medium text-accent hover:text-accent-strong"
                >
                  {tn("markAllRead")}
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifItems.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-tertiary">{tn("empty")}</p>
              ) : (
                notifItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex w-full flex-col gap-0.5 border-b border-hairline px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-raised ${
                      item.readAt ? "" : "bg-accent/5"
                    }`}
                  >
                    <span className="text-sm text-text-primary">
                      {tn(`types.${item.type}`, {
                        number: item.payload.ticketNumber,
                        title: item.payload.ticketTitle,
                      })}
                    </span>
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {relativeTime(item.createdAt, locale)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        <LocaleSwitcher />
      </div>

      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-raised"
        >
          <Avatar person={user} size="sm" />
          <div className="hidden text-left sm:block">
            <p className="truncate text-xs font-medium leading-tight text-text-primary">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-[10px] uppercase tracking-wider leading-tight text-text-tertiary">
              {user.roles.join(" · ")}
            </p>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-text-tertiary transition-transform ${userOpen ? "rotate-180" : ""}`}
            strokeWidth={1.75}
          />
        </button>

        {userOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 animate-rise-in overflow-hidden rounded-xl border border-hairline bg-surface py-1.5 shadow-xl shadow-black/40">
            <button
              onClick={() => {
                setUserOpen(false);
                setHistoryQuery("");
                setHistoryPage(1);
                setHistoryOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <History className="h-4 w-4" strokeWidth={1.75} />
              {tu("pastTickets")}
            </button>

            {[
              ...(POINTS_SYSTEM_ENABLED
                ? [
                    { label: tu("analytics"), icon: BarChart3 },
                    { label: tu("achievements"), icon: Award },
                  ]
                : []),
              { label: tu("support"), icon: LifeBuoy },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  title={tu("comingSoon")}
                  className="flex cursor-not-allowed items-center gap-3 px-4 py-2 text-sm text-text-tertiary opacity-60"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </div>
              );
            })}

            <div className="my-1.5 border-t border-hairline" />

            <Link
              href="/settings"
              onClick={() => setUserOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              {t("settings")}
            </Link>
            <button
              onClick={async () => {
                setUserOpen(false);
                setSigningOut(true);
                await fetch("/api/auth/logout", { method: "POST" });
                await new Promise((resolve) => setTimeout(resolve, 900));
                router.push("/login");
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-priority-urgent"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              {t("logout")}
            </button>
          </div>
        )}
      </div>

      {signingOut && <FullScreenLoader label={tc("signingOut")} />}
    </header>
  );
}
