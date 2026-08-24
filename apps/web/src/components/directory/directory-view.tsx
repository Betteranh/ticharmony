"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Laptop,
  Lock,
  Phone,
  Plus,
  Search,
  ShieldOff,
  KeyRound,
  ShieldQuestion,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import type { Asset, DirectoryUser, UserLicense } from "@/lib/types";
import { getDirectoryMock } from "@/lib/directory-mock";
import { relativeTime } from "@/lib/format";

const LICENSE_SUGGESTIONS = ["Office 365", "pCloud"];

type Tab = "profile" | "groups" | "licenses" | "devices" | "authentication";

interface Labels {
  back: string;
  searchPlaceholder: string;
  noUsers: string;
  tabs: Record<Tab, string>;
  profile: Record<
    | "identity"
    | "displayName"
    | "username"
    | "title"
    | "employeeId"
    | "email"
    | "phone"
    | "organization"
    | "address"
    | "department"
    | "lastLogin",
    string
  >;
  groups: Record<"title" | "name" | "action" | "addPlaceholder" | "add", string>;
  licenses: Record<
    "title" | "name" | "action" | "namePlaceholder" | "emailPlaceholder" | "passwordPlaceholder" | "add" | "empty",
    string
  >;
  devices: Record<"title" | "viewInAssets" | "empty", string>;
  authentication: Record<
    | "actions"
    | "resetPassword"
    | "lockAccount"
    | "resetMfa"
    | "disableAccount"
    | "methods"
    | "mfaStatus"
    | "mfaEnrolled"
    | "mfaNotEnrolled"
    | "passwordExpired"
    | "yes"
    | "no"
    | "identityVerification"
    | "sendVerificationCode",
    string
  >;
  simulatedAction: string;
}

export function DirectoryView({
  tenantId,
  tenantName,
  tenantAddress,
  users,
  assets,
  canManage,
  locale,
  labels,
}: {
  tenantId: string;
  tenantName: string;
  tenantAddress: string | null;
  users: DirectoryUser[];
  assets: Asset[];
  canManage: boolean;
  locale: string;
  labels: Labels;
}) {
  const ta = useTranslations("assets");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>("profile");
  const [revealedNotes, setRevealedNotes] = useState<Record<string, boolean>>({});
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [licensesByUser, setLicensesByUser] = useState<Record<string, UserLicense[]>>(() =>
    Object.fromEntries(users.map((u) => [u.id, u.licenses])),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const selected = users.find((u) => u.id === selectedId) ?? null;
  const mock = selected ? getDirectoryMock(selected) : null;
  const userAssets = useMemo(
    () => (selectedId ? assets.filter((a) => a.assignee?.id === selectedId) : []),
    [assets, selectedId],
  );

  function simulate(label: string) {
    setActionNote(label);
    setTimeout(() => setActionNote((current) => (current === label ? null : current)), 2000);
  }

  function selectUser(id: string) {
    setSelectedId(id);
    setTab("profile");
    setRevealedNotes({});
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          {labels.back}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
          {tenantName}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col rounded-xl border border-hairline bg-surface">
          <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-tertiary">{labels.noUsers}</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-hairline px-3 py-2.5 text-left transition-colors last:border-0 ${
                    u.id === selectedId ? "bg-surface-raised" : "hover:bg-surface-raised/60"
                  }`}
                >
                  <Avatar person={u} size="sm" />
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">{u.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selected && mock ? (
          <div className="rounded-xl border border-hairline bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar person={selected} />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="text-xs text-text-tertiary">{selected.email}</p>
                </div>
              </div>
              {actionNote && (
                <span className="rounded-full border border-hairline bg-surface-raised px-3 py-1 text-xs text-text-secondary">
                  {actionNote}
                </span>
              )}
            </div>

            <div className="flex border-b border-hairline px-5">
              {(Object.keys(labels.tabs) as Tab[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    tab === key
                      ? "border-accent text-text-primary"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {labels.tabs[key]}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              {tab === "profile" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="mb-3 text-sm font-medium text-text-primary">{labels.profile.identity}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label={labels.profile.displayName} value={`${selected.firstName} ${selected.lastName}`} />
                      <Field label={labels.profile.username} value={selected.email.split("@")[0]} />
                      <Field label={labels.profile.title} value={mock.title} />
                      <Field label={labels.profile.employeeId} value={mock.employeeId} />
                      <Field label={labels.profile.email} value={selected.email} />
                      <Field label={labels.profile.phone} value={selected.phone ?? "—"} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium text-text-primary">{labels.profile.organization}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label={labels.profile.department} value={selected.department ?? "—"} />
                      <Field label={labels.profile.address} value={tenantAddress ?? "—"} />
                      <Field label={labels.profile.lastLogin} value={relativeTime(mock.lastLoginAt, locale)} />
                    </div>
                  </div>
                </div>
              )}

              {tab === "groups" && (
                <div>
                  <p className="mb-3 text-sm font-medium text-text-primary">{labels.groups.title}</p>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-text-tertiary">
                        <th className="border-b border-hairline pb-2 font-medium">{labels.groups.name}</th>
                        <th className="border-b border-hairline pb-2 text-right font-medium">{labels.groups.action}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mock.groups.map((g) => (
                        <tr key={g}>
                          <td className="border-b border-hairline py-2.5 text-text-primary">{g}</td>
                          <td className="border-b border-hairline py-2.5 text-right">
                            {g !== "Domain Users" && (
                              <button
                                onClick={() => simulate(labels.simulatedAction)}
                                className="text-text-tertiary transition-colors hover:text-priority-urgent"
                              >
                                <X className="ml-auto h-4 w-4" strokeWidth={1.75} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex items-center gap-2">
                    <select className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-text-secondary outline-none">
                      <option>{labels.groups.addPlaceholder}</option>
                    </select>
                    <button
                      onClick={() => simulate(labels.simulatedAction)}
                      className="rounded-lg border border-hairline px-3.5 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-raised"
                    >
                      {labels.groups.add}
                    </button>
                  </div>
                </div>
              )}

              {tab === "licenses" && selected && (
                <LicensesSection
                  tenantId={tenantId}
                  userId={selected.id}
                  licenses={licensesByUser[selected.id] ?? []}
                  onLicensesChange={(next) =>
                    setLicensesByUser((cur) => ({ ...cur, [selected.id]: next }))
                  }
                  canManage={canManage}
                  labels={labels.licenses}
                />
              )}

              {tab === "devices" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{labels.devices.title}</p>
                    <Link
                      href={`/assets/${tenantId}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      {labels.devices.viewInAssets}
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                  </div>
                  {userAssets.length === 0 ? (
                    <p className="text-sm text-text-tertiary">{labels.devices.empty}</p>
                  ) : (
                    userAssets.map((asset) => (
                      <div key={asset.id} className="rounded-lg border border-hairline">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <Laptop className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{asset.model}</p>
                            <p className="text-xs text-text-tertiary">{asset.assetTag}</p>
                          </div>
                        </div>
                        <div className="border-t border-hairline px-4 py-3">
                          <p className="mb-2 text-[11px] uppercase tracking-wider text-text-tertiary">
                            {ta("notes.title")}
                          </p>
                          {asset.notes.length === 0 ? (
                            <p className="text-xs text-text-tertiary">{ta("notes.empty")}</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {asset.notes.map((note) => (
                                <div
                                  key={note.id}
                                  className="flex items-start justify-between gap-2 rounded-lg border border-hairline bg-surface-raised px-3 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-text-primary">{note.label}</p>
                                    <p className="break-words font-mono text-xs text-text-secondary">
                                      {note.sensitive && !revealedNotes[note.id]
                                        ? "•".repeat(Math.min(note.value.length, 24))
                                        : note.value}
                                    </p>
                                  </div>
                                  {note.sensitive && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevealedNotes((r) => ({ ...r, [note.id]: !r[note.id] }))
                                      }
                                      className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
                                    >
                                      {revealedNotes[note.id] ? (
                                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "authentication" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-text-primary">{labels.authentication.actions}</p>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton icon={KeyRound} label={labels.authentication.resetPassword} onClick={() => simulate(labels.simulatedAction)} />
                      <ActionButton icon={Lock} label={labels.authentication.lockAccount} onClick={() => simulate(labels.simulatedAction)} />
                      <ActionButton icon={ShieldQuestion} label={labels.authentication.resetMfa} onClick={() => simulate(labels.simulatedAction)} />
                      <ActionButton icon={ShieldOff} label={labels.authentication.disableAccount} onClick={() => simulate(labels.simulatedAction)} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium text-text-primary">{labels.authentication.methods}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label={labels.authentication.mfaStatus}
                        value={mock.mfaEnrolled ? labels.authentication.mfaEnrolled : labels.authentication.mfaNotEnrolled}
                      />
                      <Field
                        label={labels.authentication.passwordExpired}
                        value={mock.passwordExpired ? labels.authentication.yes : labels.authentication.no}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium text-text-primary">{labels.authentication.identityVerification}</p>
                    <button
                      onClick={() => simulate(labels.simulatedAction)}
                      className="flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
                    >
                      <Phone className="h-4 w-4" strokeWidth={1.75} />
                      {labels.authentication.sendVerificationCode}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-sm text-text-tertiary">
            {labels.noUsers}
          </div>
        )}
      </div>
    </div>
  );
}

function LicensesSection({
  tenantId,
  userId,
  licenses,
  onLicensesChange,
  canManage,
  labels,
}: {
  tenantId: string;
  userId: string;
  licenses: UserLicense[];
  onLicensesChange: (licenses: UserLicense[]) => void;
  canManage: boolean;
  labels: Labels["licenses"];
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adding, setAdding] = useState(false);

  function preventEnterSubmit(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/directory/${tenantId}/users/${userId}/licenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setAdding(false);
    if (res.ok) {
      const license = (await res.json()) as UserLicense;
      onLicensesChange([...licenses, license]);
      setName("");
      setEmail("");
      setPassword("");
    }
  }

  async function handleDelete(licenseId: string) {
    const res = await fetch(
      `/api/directory/${tenantId}/users/${userId}/licenses/${licenseId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      onLicensesChange(licenses.filter((l) => l.id !== licenseId));
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-text-primary">{labels.title}</p>

      {licenses.length === 0 ? (
        <p className="text-sm text-text-tertiary">{labels.empty}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-text-tertiary">
              <th className="border-b border-hairline pb-2 font-medium">{labels.name}</th>
              {canManage && (
                <th className="border-b border-hairline pb-2 text-right font-medium">{labels.action}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {licenses.map((license) => (
              <tr key={license.id}>
                <td className="border-b border-hairline py-2.5 align-top">
                  <p className="font-medium text-text-primary">{license.name}</p>
                  <p className="text-xs text-text-tertiary">{license.email}</p>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-text-secondary">
                    {revealed[license.id] ? license.password : "•".repeat(Math.min(license.password.length, 20))}
                    <button
                      type="button"
                      onClick={() => setRevealed((r) => ({ ...r, [license.id]: !r[license.id] }))}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      {revealed[license.id] ? (
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </td>
                {canManage && (
                  <td className="border-b border-hairline py-2.5 text-right align-top">
                    <button
                      onClick={() => handleDelete(license.id)}
                      className="text-text-tertiary transition-colors hover:text-priority-urgent"
                    >
                      <Trash2 className="ml-auto h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-hairline-strong p-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={preventEnterSubmit}
            placeholder={labels.namePlaceholder}
            list="license-name-suggestions"
            className="w-full rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/60"
          />
          <datalist id="license-name-suggestions">
            {LICENSE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={preventEnterSubmit}
            placeholder={labels.emailPlaceholder}
            className="w-full rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/60"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={preventEnterSubmit}
            placeholder={labels.passwordPlaceholder}
            className="w-full rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/60"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !name.trim() || !email.trim() || !password.trim()}
            className="flex items-center justify-center gap-1 self-start rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={1.75} />
            {labels.add}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Lock;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-hairline px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-hairline-strong hover:text-text-primary"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </button>
  );
}
