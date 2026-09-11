"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Eye,
  EyeOff,
  Laptop,
  Pencil,
  Plus,
  Search,
  KeyRound,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import type { Asset, DirectoryUser, UserLicense } from "@/lib/types";
import { getDirectoryMock } from "@/lib/directory-mock";
import { relativeTime } from "@/lib/format";

const LICENSE_SUGGESTIONS = ["Office 365", "pCloud"];

const STATUS_DOT: Record<"ACTIVE" | "INVITED" | "DISABLED", string> = {
  ACTIVE: "bg-status-resolved",
  INVITED: "bg-status-open",
  DISABLED: "bg-status-closed",
};

// Sentinel selection id for the company profile row — sits above the
// employee list and is selected by default, ahead of any employee.
const COMPANY_ROW_ID = "__company__";

type Tab = "profile" | "licenses" | "devices" | "authentication";

interface Labels {
  back: string;
  searchPlaceholder: string;
  noUsers: string;
  company: Record<"rowLabel" | "sectionTitle" | "name" | "address" | "companyNumber", string>;
  edit: Record<"button" | "save" | "cancel" | "error" | "disable" | "enable", string>;
  tabs: Record<Tab, string>;
  profile: Record<
    | "identity"
    | "displayName"
    | "username"
    | "employeeId"
    | "email"
    | "phone"
    | "organization"
    | "address"
    | "lastLogin",
    string
  >;
  licenses: Record<
    "title" | "name" | "action" | "namePlaceholder" | "emailPlaceholder" | "passwordPlaceholder" | "add" | "empty",
    string
  >;
  devices: Record<"title" | "viewInAssets" | "empty", string>;
  authentication: Record<"actions" | "resetPassword", string>;
  addEmployee: Record<
    | "button"
    | "firstNameLabel"
    | "lastNameLabel"
    | "emailLabel"
    | "phoneLabel"
    | "passwordLabel"
    | "submit"
    | "cancel"
    | "error",
    string
  >;
}

export function DirectoryView({
  tenantId,
  tenantName,
  tenantAddress,
  tenantCompanyNumber,
  tenantActive,
  users,
  assets,
  canManage,
  isSuperAdmin,
  locale,
  labels,
}: {
  tenantId: string;
  tenantName: string;
  tenantAddress: string | null;
  tenantCompanyNumber: string | null;
  tenantActive: boolean;
  users: DirectoryUser[];
  assets: Asset[];
  canManage: boolean;
  isSuperAdmin: boolean;
  locale: string;
  labels: Labels;
}) {
  const ta = useTranslations("assets");
  const tu = useTranslations("users");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(COMPANY_ROW_ID);
  const [tab, setTab] = useState<Tab>("profile");
  const [revealedNotes, setRevealedNotes] = useState<Record<string, boolean>>({});
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [licensesByUser, setLicensesByUser] = useState<Record<string, UserLicense[]>>(() =>
    Object.fromEntries(users.map((u) => [u.id, u.licenses])),
  );
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [empFirstName, setEmpFirstName] = useState("");
  const [empLastName, setEmpLastName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empSaving, setEmpSaving] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmingPasswordReset, setConfirmingPasswordReset] = useState(false);
  const [passwordResetSaving, setPasswordResetSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? users.filter(
          (u) =>
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        )
      : users;
    // Disabled accounts sink to the bottom of the list, otherwise the
    // existing alphabetical order (from the API) is preserved (stable sort).
    return [...matches].sort(
      (a, b) => Number(a.status === "DISABLED") - Number(b.status === "DISABLED"),
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
    setEditingEmployee(false);
    setConfirmingStatus(false);
    setConfirmingPasswordReset(false);
  }

  async function handleResetPassword() {
    if (!selected) return;
    setPasswordResetSaving(true);
    const res = await fetch(`/api/tenants/${tenantId}/users/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    setPasswordResetSaving(false);
    setConfirmingPasswordReset(false);
    if (res.ok) {
      router.refresh();
    } else {
      simulate(labels.edit.error);
    }
  }

  async function handleToggleStatus() {
    if (!selected) return;
    const nextStatus = selected.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setStatusSaving(true);
    const res = await fetch(`/api/tenants/${tenantId}/users/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setStatusSaving(false);
    setConfirmingStatus(false);
    if (res.ok) {
      router.refresh();
    } else {
      simulate(labels.edit.error);
    }
  }

  function startEditingEmployee() {
    if (!selected) return;
    setEmpFirstName(selected.firstName);
    setEmpLastName(selected.lastName);
    setEmpEmail(selected.email);
    setEmpError(null);
    setEditingEmployee(true);
  }

  async function handleSaveEmployee() {
    if (!selected || !empFirstName.trim() || !empLastName.trim() || !empEmail.trim()) return;
    setEmpSaving(true);
    setEmpError(null);
    const res = await fetch(`/api/tenants/${tenantId}/users/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: empFirstName.trim(),
        lastName: empLastName.trim(),
        email: empEmail.trim(),
      }),
    });
    setEmpSaving(false);
    if (res.ok) {
      setEditingEmployee(false);
      router.refresh();
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setEmpError(body?.error ?? labels.edit.error);
    }
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
            {isSuperAdmin && (
              <AddEmployeeButton
                tenantId={tenantId}
                labels={labels.addEmployee}
                onCreated={() => router.refresh()}
              />
            )}
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            <button
              onClick={() => selectUser(COMPANY_ROW_ID)}
              className={`flex w-full items-center gap-2.5 border-b border-hairline px-3 py-2.5 text-left transition-colors ${
                selectedId === COMPANY_ROW_ID ? "bg-surface-raised" : "hover:bg-surface-raised/60"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
                <Building2 className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-text-primary">{tenantName}</p>
                <p className="truncate text-xs text-text-tertiary">{labels.company.rowLabel}</p>
              </div>
            </button>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-tertiary">{labels.noUsers}</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-hairline px-3 py-2.5 text-left transition-colors last:border-0 ${
                    u.id === selectedId ? "bg-surface-raised" : "hover:bg-surface-raised/60"
                  } ${u.status === "DISABLED" ? "opacity-50" : ""}`}
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

        {selectedId === COMPANY_ROW_ID ? (
          <CompanyProfileCard
            tenantId={tenantId}
            tenantName={tenantName}
            tenantAddress={tenantAddress}
            tenantCompanyNumber={tenantCompanyNumber}
            tenantActive={tenantActive}
            isSuperAdmin={isSuperAdmin}
            labels={{ ...labels.company, edit: labels.edit }}
            onSaved={() => router.refresh()}
          />
        ) : selected && mock ? (
          <div className="rounded-xl border border-hairline bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar person={selected} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">
                      {selected.firstName} {selected.lastName}
                    </p>
                    {selected.status === "DISABLED" && (
                      <span className="flex items-center gap-1 rounded-full border border-hairline bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT.DISABLED}`} />
                        {tu("status.DISABLED")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">{selected.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {actionNote && (
                  <span className="rounded-full border border-hairline bg-surface-raised px-3 py-1 text-xs text-text-secondary">
                    {actionNote}
                  </span>
                )}
                {isSuperAdmin &&
                  (confirmingStatus ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleToggleStatus}
                        disabled={statusSaving}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          selected.status === "ACTIVE"
                            ? "bg-priority-urgent/10 text-priority-urgent hover:bg-priority-urgent/20"
                            : "bg-accent text-canvas hover:bg-accent-strong"
                        }`}
                      >
                        {labels.edit.save}
                      </button>
                      <button
                        onClick={() => setConfirmingStatus(false)}
                        className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
                      >
                        {labels.edit.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingStatus(true)}
                      className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-hairline-strong hover:text-text-primary"
                    >
                      {selected.status === "ACTIVE" ? labels.edit.disable : labels.edit.enable}
                    </button>
                  ))}
              </div>
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
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">{labels.profile.identity}</p>
                      {isSuperAdmin && !editingEmployee && (
                        <button
                          onClick={startEditingEmployee}
                          className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong"
                        >
                          <Pencil className="h-3 w-3" strokeWidth={1.75} />
                          {labels.edit.button}
                        </button>
                      )}
                    </div>
                    {editingEmployee ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <EditInput label={tu("form.firstNameLabel")} value={empFirstName} onChange={setEmpFirstName} required />
                          <EditInput label={tu("form.lastNameLabel")} value={empLastName} onChange={setEmpLastName} required />
                          <EditInput label={labels.profile.email} value={empEmail} onChange={setEmpEmail} required type="email" />
                        </div>
                        {empError && <p className="text-xs text-priority-urgent">{empError}</p>}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveEmployee}
                            disabled={empSaving || !empFirstName.trim() || !empLastName.trim() || !empEmail.trim()}
                            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
                          >
                            {labels.edit.save}
                          </button>
                          <button
                            onClick={() => setEditingEmployee(false)}
                            className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
                          >
                            {labels.edit.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field label={labels.profile.displayName} value={`${selected.firstName} ${selected.lastName}`} />
                        <Field label={labels.profile.username} value={selected.email.split("@")[0]} />
                        <Field label={labels.profile.employeeId} value={selected.employeeCode ?? "—"} />
                        <Field label={labels.profile.email} value={selected.email} />
                        <Field label={labels.profile.phone} value={selected.phone ?? "—"} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium text-text-primary">{labels.profile.organization}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label={labels.profile.address} value={tenantAddress ?? "—"} />
                      <Field label={labels.profile.lastLogin} value={relativeTime(mock.lastLoginAt, locale)} />
                    </div>
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
                <div>
                  <p className="mb-3 text-sm font-medium text-text-primary">{labels.authentication.actions}</p>
                  {confirmingPasswordReset ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleResetPassword}
                        disabled={passwordResetSaving}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
                      >
                        {labels.edit.save}
                      </button>
                      <button
                        onClick={() => setConfirmingPasswordReset(false)}
                        className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
                      >
                        {labels.edit.cancel}
                      </button>
                    </div>
                  ) : (
                    <ActionButton
                      icon={KeyRound}
                      label={labels.authentication.resetPassword}
                      onClick={() => setConfirmingPasswordReset(true)}
                    />
                  )}
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

function AddEmployeeButton({
  tenantId,
  labels,
  onCreated,
}: {
  tenantId: string;
  labels: Labels["addEmployee"];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={labels.button}
        className="flex shrink-0 items-center justify-center rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        <UserPlus className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <AddEmployeeDialog
          tenantId={tenantId}
          labels={labels}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            onCreated();
          }}
        />
      )}
    </>
  );
}

function AddEmployeeDialog({
  tenantId,
  labels,
  onClose,
  onCreated,
}: {
  tenantId: string;
  labels: Labels["addEmployee"];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/tenants/${tenantId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone.trim() || undefined,
        password,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      onCreated();
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? labels.error);
    }
  }

  return (
    <Modal title={labels.button} onClose={onClose} widthClass="w-[420px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.firstNameLabel}</span>
            <input
              required
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.lastNameLabel}</span>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.emailLabel}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.phoneLabel}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.passwordLabel}</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        {error && <p className="text-xs text-priority-urgent">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-hairline px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {labels.submit}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CompanyProfileCard({
  tenantId,
  tenantName,
  tenantAddress,
  tenantCompanyNumber,
  tenantActive,
  isSuperAdmin,
  labels,
  onSaved,
}: {
  tenantId: string;
  tenantName: string;
  tenantAddress: string | null;
  tenantCompanyNumber: string | null;
  tenantActive: boolean;
  isSuperAdmin: boolean;
  labels: Labels["company"] & { edit: Labels["edit"] };
  onSaved: () => void;
}) {
  const tu = useTranslations("users");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenantName);
  const [address, setAddress] = useState(tenantAddress ?? "");
  const [companyNumber, setCompanyNumber] = useState(tenantCompanyNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  function startEditing() {
    setName(tenantName);
    setAddress(tenantAddress ?? "");
    setCompanyNumber(tenantCompanyNumber ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim() || null,
        companyNumber: companyNumber.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      onSaved();
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? labels.edit.error);
    }
  }

  async function handleToggleStatus() {
    setStatusSaving(true);
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !tenantActive }),
    });
    setStatusSaving(false);
    setConfirmingStatus(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">{tenantName}</p>
            {!tenantActive && (
              <span className="flex items-center gap-1 rounded-full border border-hairline bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT.DISABLED}`} />
                {tu("status.DISABLED")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin &&
            !editing &&
            (confirmingStatus ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleStatus}
                  disabled={statusSaving}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    tenantActive
                      ? "bg-priority-urgent/10 text-priority-urgent hover:bg-priority-urgent/20"
                      : "bg-accent text-canvas hover:bg-accent-strong"
                  }`}
                >
                  {labels.edit.save}
                </button>
                <button
                  onClick={() => setConfirmingStatus(false)}
                  className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
                >
                  {labels.edit.cancel}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingStatus(true)}
                className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-hairline-strong hover:text-text-primary"
              >
                {tenantActive ? labels.edit.disable : labels.edit.enable}
              </button>
            ))}
          {isSuperAdmin && !editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-strong"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              {labels.edit.button}
            </button>
          )}
        </div>
      </div>
      <div className="px-5 py-5">
        <p className="mb-3 text-sm font-medium text-text-primary">{labels.sectionTitle}</p>
        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <EditInput label={labels.name} value={name} onChange={setName} required />
              <EditInput label={labels.address} value={address} onChange={setAddress} />
              <EditInput label={labels.companyNumber} value={companyNumber} onChange={setCompanyNumber} />
            </div>
            {error && <p className="text-xs text-priority-urgent">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {labels.edit.save}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
              >
                {labels.edit.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={labels.name} value={tenantName} />
            <Field label={labels.address} value={tenantAddress ?? "—"} />
            <Field label={labels.companyNumber} value={tenantCompanyNumber ?? "—"} />
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

function EditInput({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent/60"
      />
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof KeyRound;
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
