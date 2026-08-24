import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.login" });
  return {
    title: t("title"),
    description: t("description"),
    // Existing users only land here via a direct link from the app itself;
    // no value ranking on this URL, and it would otherwise compete with the
    // homepage for brand-name queries.
    robots: { index: false, follow: true },
  };
}

const FEED = [
  { id: "1042", label: "Imprimante réseau hors ligne", tag: "URGENT", tagClass: "text-priority-urgent" },
  { id: "1041", label: "VPN — certificat expiré", tag: "EN COURS", tagClass: "text-status-in-progress" },
  { id: "1039", label: "Accès dossier Finance 2026", tag: "ATTENTE", tagClass: "text-status-pending" },
  { id: "1037", label: "MAJ Windows bloquée à 67%", tag: "RÉSOLU", tagClass: "text-status-resolved" },
];

export default async function LoginPage() {
  const t = await getTranslations("auth.login");

  return (
    <main className="relative flex min-h-screen flex-1 overflow-hidden">
      {/* Left: brand / mission-control panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-hairline bg-surface px-14 py-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 20% 10%, rgba(47,169,246,0.16), transparent 45%), radial-gradient(circle at 80% 85%, rgba(108,208,255,0.12), transparent 40%)",
          }}
        />

        <div className="relative animate-rise-in">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-canvas font-display text-lg font-bold">
              T
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              TIC<span className="text-accent">Harmony</span>
            </span>
          </div>

          <h1 className="mt-20 max-w-md font-display text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary">
            Le support,
            <br />
            sous contrôle.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
            Une tour de contrôle unique pour vos équipes support — interne et
            multi-client — avec une visibilité totale sur chaque ticket.
          </p>
        </div>

        <div className="relative animate-rise-in" style={{ animationDelay: "120ms" }}>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            Flux en direct
          </p>
          <div className="flex flex-col gap-2">
            {FEED.map((item, i) => (
              <div
                key={item.id}
                className="animate-rise-in flex items-center justify-between gap-4 rounded-lg border border-hairline bg-surface-raised px-4 py-3"
                style={{ animationDelay: `${180 + i * 70}ms` }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="shrink-0 font-mono text-xs text-text-tertiary">
                    #{item.id}
                  </span>
                  <span className="truncate text-sm text-text-secondary">
                    {item.label}
                  </span>
                </div>
                <span className={`shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider ${item.tagClass}`}>
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-16 lg:w-[480px] lg:flex-none">
        <div className="w-full max-w-sm animate-rise-in" style={{ animationDelay: "80ms" }}>
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-canvas font-display text-lg font-bold">
              T
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              TIC<span className="text-accent">Harmony</span>
            </span>
          </div>

          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            {t("title")}
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">{t("subtitle")}</p>

          <LoginForm
            labels={{
              email: t("email"),
              password: t("password"),
              submit: t("submit"),
              error: t("error"),
              chooseWorkspace: t("chooseWorkspace"),
            }}
          />

          <p className="mt-6 text-center text-sm text-text-tertiary">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-accent hover:text-accent-strong">
              {t("createAccount")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
