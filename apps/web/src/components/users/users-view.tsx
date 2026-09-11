"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import type { TenantUser, UserRole } from "@/lib/types";

interface Labels {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  columns: Record<"name" | "email" | "roles" | "status", string>;
  empty: string;
  noResults: string;
  newUser: string;
  form: Record<
    | "firstNameLabel"
    | "lastNameLabel"
    | "emailLabel"
    | "phoneLabel"
    | "passwordLabel"
    | "rolesLabel"
    | "create"
    | "cancel",
    string
  >;
  role: Record<UserRole, string>;
  status: Record<"ACTIVE" | "INVITED" | "DISABLED", string>;
  edit: Record<
    "button" | "save" | "cancel" | "error" | "disable" | "enable" | "cannotDisableSelf",
    string
  >;
  detail: Record<"employeeCode", string>;
}

const STATUS_DOT: Record<"ACTIVE" | "INVITED" | "DISABLED", string> = {
  ACTIVE: "bg-status-resolved",
  INVITED: "bg-status-open",
  DISABLED: "bg-status-closed",
};

export function UsersView({
  users,
  canManage,
  currentUserId,
  assignableRoles,
  labels,
}: {
  users: TenantUser[];
  canManage: boolean;
  currentUserId: string;
  assignableRoles: UserRole[];
  labels: Labels;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? users.filter(
          (u) =>
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        )
      : users;
    // Disabled accounts sink to the bottom rather than cluttering the top of
    // the list — same convention already used for employees/companies in
    // Directory.
    return [...matches].sort(
      (a, b) => Number(a.status === "DISABLED") - Number(b.status === "DISABLED"),
    );
  }, [users, query]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">{labels.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{labels.subtitle}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            {labels.newUser}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface p-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {labels.empty}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {labels.noResults}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                <th className="px-5 py-3">{labels.columns.name}</th>
                <th className="px-3 py-3">{labels.columns.email}</th>
                <th className="px-3 py-3">{labels.columns.roles}</th>
                <th className="px-3 py-3 text-right">{labels.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className={`animate-rise-in cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-surface-hover ${
                    u.status === "DISABLED" ? "opacity-50" : ""
                  }`}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar person={u} size="sm" />
                      <span className="text-text-primary">
                        {u.firstName} {u.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-text-secondary">{u.email}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full border border-hairline bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-primary"
                        >
                          {labels.role[role]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary whitespace-nowrap">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[u.status]}`} />
                      {labels.status[u.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <CreateUserDialog
          assignableRoles={assignableRoles}
          labels={labels}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            router.refresh();
          }}
        />
      )}

      {selected && (
        <EmployeeDialog
          user={selected}
          canManage={canManage}
          isSelf={selected.id === currentUserId}
          labels={labels}
          onClose={() => setSelectedId(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function EmployeeDialog({
  user,
  canManage,
  isSelf,
  labels,
  onClose,
  onSaved,
}: {
  user: TenantUser;
  canManage: boolean;
  isSelf: boolean;
  labels: Labels;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState(false);

  function startEditing() {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setError(null);
    setEditing(true);
  }

  async function saveEdit() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
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

  async function toggleStatus() {
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    setSaving(false);
    setConfirmingStatus(false);
    if (res.ok) onSaved();
    else setError(labels.edit.error);
  }

  return (
    <Modal title={`${user.firstName} ${user.lastName}`} onClose={onClose} widthClass="w-[420px]">
      <div className="flex flex-col gap-4 p-5">
        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  {labels.form.firstNameLabel}
                </span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  {labels.form.lastNameLabel}
                </span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{labels.form.emailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
              />
            </label>
            {error && <p className="text-xs text-priority-urgent">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()}
                className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {labels.edit.save}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-hairline px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
              >
                {labels.edit.cancel}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <p className="text-xs font-medium text-text-tertiary">{labels.columns.email}</p>
                <p className="text-text-primary">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">{labels.detail.employeeCode}</p>
                <p className="text-text-primary">{user.employeeCode ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">{labels.columns.status}</p>
                <p className="flex items-center gap-1.5 text-text-primary">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[user.status]}`} />
                  {labels.status[user.status]}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-text-tertiary">{labels.columns.roles}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-hairline bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-primary"
                    >
                      {labels.role[role]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex flex-col gap-2 border-t border-hairline pt-4">
                <button
                  onClick={startEditing}
                  className="self-start text-xs font-medium text-accent hover:text-accent-strong"
                >
                  {labels.edit.button}
                </button>

                {isSelf ? (
                  <p className="text-xs text-text-tertiary">{labels.edit.cannotDisableSelf}</p>
                ) : confirmingStatus ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleStatus}
                      disabled={saving}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        user.status === "ACTIVE"
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
                    className="self-start rounded-lg border border-hairline px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-hairline-strong hover:text-text-primary"
                  >
                    {user.status === "ACTIVE" ? labels.edit.disable : labels.edit.enable}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function CreateUserDialog({
  assignableRoles,
  labels,
  onClose,
  onSaved,
}: {
  assignableRoles: UserRole[];
  labels: Labels;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(
    assignableRoles.length === 1 ? assignableRoles : [],
  );
  const [submitting, setSubmitting] = useState(false);

  const showRolePicker = assignableRoles.length > 1;

  function toggleRole(role: UserRole) {
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (roles.length === 0) return;
    setSubmitting(true);
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone.trim() || undefined,
        password,
        roles,
      }),
    });
    setSubmitting(false);
    onSaved();
  }

  return (
    <Modal title={labels.newUser} onClose={onClose} widthClass="w-[420px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.form.firstNameLabel}</span>
            <input
              required
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.form.lastNameLabel}</span>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.emailLabel}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.phoneLabel}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.passwordLabel}</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        {showRolePicker && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.form.rolesLabel}</span>
            <div className="flex flex-wrap gap-3">
              {assignableRoles.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="h-3.5 w-3.5 rounded border-hairline"
                  />
                  {labels.role[role]}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-hairline px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
          >
            {labels.form.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting || roles.length === 0}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {labels.form.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}
