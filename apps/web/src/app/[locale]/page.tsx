import Image from "next/image";
import {
  Layers,
  ShieldCheck,
  Lock,
  Gauge,
  KeyRound,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { SITE_URL } from "@/lib/site";

// Organization structured data (schema.org), read by search engines to build
// the knowledge-panel entry for "TIC Harmony" — separate from the page's
// visible copy, so it doesn't need to duplicate marketing wording.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TIC Harmony",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/tic-harmony-logo.png`,
  description:
    "ASBL belge proposant un support informatique et une plateforme de gestion de tickets (IT4U) aux PME et ASBL partenaires.",
  areaServed: "BE",
};

const DEMO_TICKETS = [
  { id: "1042", title: "Imprimante réseau hors ligne", priority: "URGENT" as const },
  { id: "1041", title: "VPN — certificat expiré", priority: "HIGH" as const },
  { id: "1039", title: "Accès dossier Finance 2026", priority: "LOW" as const },
];

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    { icon: Layers, ...t.raw("features.tickets") },
    { icon: ShieldCheck, ...t.raw("features.multiTenant") },
    { icon: Lock, ...t.raw("features.notes") },
    { icon: Gauge, ...t.raw("features.sla") },
    { icon: KeyRound, ...t.raw("features.auth") },
    { icon: BookOpen, ...t.raw("features.kb") },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      {/* Header */}
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/tic-harmony-logo.png"
            alt="TIC Harmony"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            TIC<span className="text-accent">Harmony</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-hairline-strong px-3.5 py-1.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent/60 hover:text-accent"
          >
            {t("nav.signup")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 sm:px-10 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 15% 0%, rgba(47,169,246,0.14), transparent 45%)",
          }}
        />
        <div className="relative max-w-2xl">
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-text-primary sm:text-6xl">
            {t("hero.title1")}
            <br />
            <span className="text-accent">{t("hero.title2")}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-text-secondary sm:text-base">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-canvas transition-all hover:bg-accent-strong"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {t("hero.businessLink")}
            </Link>
          </div>
        </div>
      </section>

      {/* Live demo preview */}
      <section className="border-y border-hairline bg-surface/50 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            {t("demo.title")}
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">{t("demo.subtitle")}</p>

          <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
            <div className="flex items-center gap-1 border-b border-hairline bg-surface-raised px-2 py-2">
              <span className="rounded-md bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent">
                {t("demo.tabQueue")}
              </span>
            </div>

            <div className="p-4">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
                {t("demo.myQueue")}
              </p>
              <div className="mb-4 rounded-lg border border-dashed border-hairline-strong px-4 py-3 text-sm text-text-tertiary">
                {t("demo.noneClaimed")}
              </div>

              <p className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
                <span>{t("demo.incidents")}</span>
                <span>{DEMO_TICKETS.length}</span>
              </p>
              <div className="flex flex-col gap-2">
                {DEMO_TICKETS.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-hairline px-4 py-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="shrink-0 font-mono text-xs text-text-tertiary">
                        #{ticket.id}
                      </span>
                      <span className="truncate text-sm text-text-primary">{ticket.title}</span>
                    </div>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            {t("features.title")}
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">{t("features.subtitle")}</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-hairline-strong"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <f.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <p className="mt-4 text-sm font-semibold text-text-primary">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-hairline px-6 py-8 sm:px-10">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-text-tertiary sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/tic-harmony-logo.png"
              alt="TIC Harmony"
              width={18}
              height={18}
              className="h-4.5 w-4.5 object-contain"
            />
            <span>TIC Harmony</span>
          </div>
          <span>© {new Date().getFullYear()} TIC Harmony — {t("footer.rights")}</span>
        </div>
      </footer>
    </main>
  );
}