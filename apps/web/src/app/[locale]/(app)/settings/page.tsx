import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, currentUser] = await Promise.all([getTranslations("settings"), getSession()]);

  if (!currentUser) {
    redirect({ href: "/login", locale });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
        {t("title")}
      </h1>

      <SettingsView
        user={currentUser!}
        labels={{
          tabs: {
            profile: t("tabs.profile"),
            account: t("tabs.account"),
          },
          profile: {
            identity: t("profile.identity"),
            firstNameLabel: t("profile.firstNameLabel"),
            lastNameLabel: t("profile.lastNameLabel"),
            save: t("profile.save"),
            saved: t("profile.saved"),
            avatarTitle: t("profile.avatarTitle"),
            avatarHint: t("profile.avatarHint"),
          },
          account: {
            title: t("account.title"),
            hint: t("account.hint"),
            currentPasswordLabel: t("account.currentPasswordLabel"),
            newPasswordLabel: t("account.newPasswordLabel"),
            confirmPasswordLabel: t("account.confirmPasswordLabel"),
            submit: t("account.submit"),
            success: t("account.success"),
            mismatch: t("account.mismatch"),
            tooShort: t("account.tooShort"),
            genericError: t("account.genericError"),
          },
        }}
      />
    </div>
  );
}
