"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";

interface Labels {
  email: string;
  password: string;
  submit: string;
  error: string;
  chooseWorkspace: string;
}

interface TenantOption {
  slug: string;
  name: string;
}

export function LoginForm({ labels }: { labels: Labels }) {
  const router = useRouter();
  const t = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pendingTenants, setPendingTenants] = useState<TenantOption[] | null>(null);

  async function submitLogin(tenantSlug?: string) {
    setStatus("loading");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...(tenantSlug ? { tenantSlug } : {}) }),
    });

    if (res.status === 409) {
      const body = await res.json();
      setPendingTenants(body.tenants);
      setStatus("idle");
      return;
    }

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setStatus("success");
    await new Promise((resolve) => setTimeout(resolve, 900));
    router.push("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitLogin();
  }

  if (status === "success") {
    return <FullScreenLoader label={t("signingIn")} />;
  }

  if (pendingTenants) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        <p className="text-sm text-text-secondary">{labels.chooseWorkspace}</p>
        {pendingTenants.map((tenant) => (
          <button
            key={tenant.slug}
            type="button"
            onClick={() => submitLogin(tenant.slug)}
            disabled={status === "loading"}
            className="flex items-center justify-between rounded-lg border border-hairline bg-surface px-4 py-3 text-left text-sm text-text-primary transition-colors hover:border-accent/60 hover:bg-surface-raised disabled:opacity-70"
          >
            {tenant.name}
            <ArrowRight className="h-4 w-4 text-text-tertiary" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <Field label={labels.email}>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent/60 placeholder:text-text-tertiary"
        />
      </Field>

      <Field label={labels.password}>
        <div className="relative">
          <input
            required
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 pr-10 text-sm text-text-primary outline-none transition-colors focus:border-accent/60 placeholder:text-text-tertiary"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-text-tertiary transition-colors hover:text-text-primary"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </Field>

      {status === "error" && (
        <p className="text-sm text-priority-urgent">{labels.error}</p>
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
