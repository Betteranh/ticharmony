"use client";

import { useState } from "react";
import { KeyRound, User as UserIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { Person } from "@/lib/types";

const AVATAR_OPTIONS = ["🙂", "😀", "😎", "🤓", "🥸", "🧐", "😊", "🙃"];

type Tab = "profile" | "account";

interface Labels {
  tabs: Record<Tab, string>;
  profile: Record<
    "identity" | "firstNameLabel" | "lastNameLabel" | "save" | "saved" | "avatarTitle" | "avatarHint",
    string
  >;
  account: Record<
    | "title"
    | "hint"
    | "currentPasswordLabel"
    | "newPasswordLabel"
    | "confirmPasswordLabel"
    | "submit"
    | "success"
    | "mismatch"
    | "tooShort"
    | "genericError",
    string
  >;
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
      />
    </label>
  );
}

export function SettingsView({ user, labels }: { user: Person; labels: Labels }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile tab
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [avatar, setAvatar] = useState(user.avatar);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Account tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
    });
    setProfileSaving(false);
    if (res.ok) {
      setProfileSaved(true);
      router.refresh();
    }
  }

  async function selectAvatar(next: string) {
    if (next === avatar) return;
    setAvatar(next);
    setAvatarSaving(true);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: next }),
    });
    setAvatarSaving(false);
    if (res.ok) router.refresh();
  }

  async function submitPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError(labels.account.tooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(labels.account.mismatch);
      return;
    }

    setPasswordSubmitting(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordSubmitting(false);

    if (res.ok) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setPasswordError(body?.error ?? labels.account.genericError);
    }
  }

  const TABS: { key: Tab; label: string; icon: typeof UserIcon }[] = [
    { key: "profile", label: labels.tabs.profile, icon: UserIcon },
    { key: "account", label: labels.tabs.account, icon: KeyRound },
  ];

  return (
    <div className="flex overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="w-52 shrink-0 border-r border-hairline py-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                tab === item.key
                  ? "bg-surface-raised font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-6">
        {tab === "profile" && (
          <div className="flex max-w-md flex-col gap-8">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {labels.profile.identity}
              </p>
              <div className="flex items-end gap-2">
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <Field
                    label={labels.profile.firstNameLabel}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Field
                    label={labels.profile.lastNameLabel}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving || !firstName.trim() || !lastName.trim()}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
                >
                  {labels.profile.save}
                </button>
              </div>
              {profileSaved && (
                <p className="mt-2 text-xs text-status-resolved">{labels.profile.saved}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {labels.profile.avatarTitle}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{labels.profile.avatarHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => selectAvatar(option)}
                    disabled={avatarSaving}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors disabled:opacity-50 ${
                      avatar === option
                        ? "border-accent bg-accent/10"
                        : "border-hairline bg-surface-raised hover:border-hairline-strong"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {labels.account.title}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">{labels.account.hint}</p>

            <form onSubmit={submitPasswordChange} className="mt-4 flex flex-col gap-3">
              <Field
                label={labels.account.currentPasswordLabel}
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Field
                label={labels.account.newPasswordLabel}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Field
                label={labels.account.confirmPasswordLabel}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {passwordError && (
                <p className="text-xs text-priority-urgent">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-status-resolved">{labels.account.success}</p>
              )}

              <button
                type="submit"
                disabled={
                  passwordSubmitting || !currentPassword || !newPassword || !confirmPassword
                }
                className="mt-1 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {labels.account.submit}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
