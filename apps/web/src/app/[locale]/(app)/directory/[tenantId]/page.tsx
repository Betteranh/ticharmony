import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api";
import { listAssets } from "@/lib/assets";
import { getSession } from "@/lib/auth";
import { listClientTenants, listClientUsers } from "@/lib/directory";
import { DirectoryView } from "@/components/directory/directory-view";

export default async function DirectoryClientPage({
  params,
}: {
  params: Promise<{ tenantId: string; locale: string }>;
}) {
  const { tenantId, locale } = await params;

  const [t, currentUser, tenants, users, assets] = await Promise.all([
    getTranslations("directory"),
    getSession(),
    listClientTenants(),
    listClientUsers(tenantId).catch((err) => {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;
      throw err;
    }),
    listAssets(tenantId).catch(() => []),
  ]);

  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant || users === null || !currentUser) notFound();

  const canManage = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");

  return (
    <DirectoryView
      tenantId={tenantId}
      tenantName={tenant.name}
      tenantAddress={tenant.address}
      users={users}
      assets={assets}
      canManage={canManage}
      locale={locale}
      labels={{
        back: t("back"),
        searchPlaceholder: t("searchPlaceholder"),
        noUsers: t("noUsers"),
        tabs: {
          profile: t("tabs.profile"),
          groups: t("tabs.groups"),
          licenses: t("tabs.licenses"),
          devices: t("tabs.devices"),
          authentication: t("tabs.authentication"),
        },
        profile: {
          identity: t("profile.identity"),
          displayName: t("profile.displayName"),
          username: t("profile.username"),
          title: t("profile.title"),
          employeeId: t("profile.employeeId"),
          email: t("profile.email"),
          phone: t("profile.phone"),
          organization: t("profile.organization"),
          address: t("profile.address"),
          department: t("profile.department"),
          lastLogin: t("profile.lastLogin"),
        },
        groups: {
          title: t("groups.title"),
          name: t("groups.name"),
          action: t("groups.action"),
          addPlaceholder: t("groups.addPlaceholder"),
          add: t("groups.add"),
        },
        licenses: {
          title: t("licenses.title"),
          name: t("licenses.name"),
          action: t("licenses.action"),
          namePlaceholder: t("licenses.namePlaceholder"),
          emailPlaceholder: t("licenses.emailPlaceholder"),
          passwordPlaceholder: t("licenses.passwordPlaceholder"),
          add: t("licenses.add"),
          empty: t("licenses.empty"),
        },
        devices: {
          title: t("devices.title"),
          viewInAssets: t("devices.viewInAssets"),
          empty: t("devices.empty"),
        },
        authentication: {
          actions: t("authentication.actions"),
          resetPassword: t("authentication.resetPassword"),
          lockAccount: t("authentication.lockAccount"),
          resetMfa: t("authentication.resetMfa"),
          disableAccount: t("authentication.disableAccount"),
          methods: t("authentication.methods"),
          mfaStatus: t("authentication.mfaStatus"),
          mfaEnrolled: t("authentication.mfaEnrolled"),
          mfaNotEnrolled: t("authentication.mfaNotEnrolled"),
          passwordExpired: t("authentication.passwordExpired"),
          yes: t("authentication.yes"),
          no: t("authentication.no"),
          identityVerification: t("authentication.identityVerification"),
          sendVerificationCode: t("authentication.sendVerificationCode"),
        },
        simulatedAction: t("simulatedAction"),
      }}
    />
  );
}
