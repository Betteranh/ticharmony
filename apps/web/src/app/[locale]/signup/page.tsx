import type { Metadata } from "next";
import { CreditCard, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "./signup-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.signup" });
  return { title: t("title"), description: t("description") };
}

export default async function SignupPage() {
  const t = await getTranslations("auth.signup");
  const tLogin = await getTranslations("auth.login");

  return (
    <main className="relative flex min-h-screen flex-1 overflow-hidden">
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
            Votre support,
            <br />
            prêt en 2 minutes.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
            {t("individualNote")}
          </p>

          <div className="mt-8 flex items-center gap-2.5 rounded-lg border border-hairline bg-surface-raised px-4 py-3">
            <CreditCard className="h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm text-text-secondary">{t("subscriptionNote")}</p>
          </div>
        </div>

        <div className="relative rounded-lg border border-hairline bg-surface-raised px-4 py-3.5">
          <p className="text-xs font-medium text-text-secondary">{t("businessTitle")}</p>
          <p className="mt-1 text-sm text-text-tertiary">{t("businessNote")}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-sm text-accent">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              +32 X XX XX XX XX
            </span>
            <span>contact@ticharmony.com</span>
          </div>
        </div>
      </div>

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

          <SignupForm
            labels={{
              avatar: t("avatar"),
              firstName: t("firstName"),
              lastName: t("lastName"),
              email: t("email"),
              password: t("password"),
              submit: t("submit"),
              error: t("error"),
              errorConflict: t("errorConflict"),
            }}
          />

          <p className="mt-6 text-center text-sm text-text-tertiary">
            {t("haveAccount")}{" "}
            <Link href="/login" className="text-accent hover:text-accent-strong">
              {tLogin("submit")}
            </Link>
          </p>

          <div className="mt-6 rounded-lg border border-hairline bg-surface px-4 py-3 lg:hidden">
            <p className="text-xs font-medium text-text-secondary">{t("businessTitle")}</p>
            <p className="mt-1 text-xs text-text-tertiary">{t("businessNote")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}