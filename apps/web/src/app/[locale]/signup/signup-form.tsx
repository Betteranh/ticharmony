"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

interface Labels {
  avatar: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  submit: string;
  error: string;
  errorConflict: string;
}

const AVATAR_OPTIONS = [
  "🙂", "😎", "🤓", "🧐", "🥳", "😇", "🤠", "🙃",
  "🦊", "🐱", "🐶", "🐼", "🐨", "🦁", "🐸", "🐧",
  "🦉", "🦄", "🐢", "🐙", "🐯", "🐰", "🐻", "🦅",
];

export function SignupForm({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "conflict">("idle");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
        avatar,
      }),
    });

    if (!res.ok) {
      setStatus(res.status === 409 ? "conflict" : "error");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <Field label={labels.avatar}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xl ring-1 ring-accent/40">
            {avatar}
          </span>
          <div className="grid grid-cols-8 gap-1.5">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors ${
                  avatar === emoji
                    ? "bg-accent/20 ring-1 ring-accent"
                    : "hover:bg-surface-raised"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={labels.firstName}>
          <input
            required
            name="firstName"
            autoComplete="given-name"
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
          />
        </Field>
        <Field label={labels.lastName}>
          <input
            required
            name="lastName"
            autoComplete="family-name"
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
          />
        </Field>
      </div>

      <Field label={labels.email}>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent/60 placeholder:text-text-tertiary"
        />
      </Field>

      <Field label={labels.password}>
        <input
          required
          type="password"
          name="password"
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent/60 placeholder:text-text-tertiary"
        />
      </Field>

      {status === "error" && (
        <p className="text-sm text-priority-urgent">{labels.error}</p>
      )}
      {status === "conflict" && (
        <p className="text-sm text-priority-urgent">{labels.errorConflict}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="group mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-canvas transition-all hover:bg-accent-strong disabled:opacity-70"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {labels.submit}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}