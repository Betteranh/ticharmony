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
  const { tenantId } = await params;

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
  const isSuperAdmin = currentUser.roles.includes("SUPER_ADMIN");

  return (
    <DirectoryView
      tenantId={tenantId}
      tenantName={tenant.name}
      tenantAddress={tenant.address}
      tenantCompanyNumber={tenant.companyNumber}
      tenantActive={tenant.active}
      users={users}
      assets={assets}
      canManage={canManage}
      isSuperAdmin={isSuperAdmin}
      labels={{
        back: t("back"),
        searchPlaceholder: t("searchPlaceholder"),
        noUsers: t("noUsers"),
        company: {
          rowLabel: t("company.rowLabel"),
          sectionTitle: t("company.sectionTitle"),
          name: t("company.name"),
          address: t("company.address"),
          companyNumber: t("company.companyNumber"),
        },
        edit: {
          button: t("edit.button"),
          save: t("edit.save"),
          cancel: t("edit.cancel"),
          error: t("edit.error"),
          disable: t("edit.disable"),
          enable: t("edit.enable"),
        },
        tabs: {
          profile: t("tabs.profile"),
          licenses: t("tabs.licenses"),
          devices: t("tabs.devices"),
          authentication: t("tabs.authentication"),
        },
        profile: {
          identity: t("profile.identity"),
          displayName: t("profile.displayName"),
          employeeId: t("profile.employeeId"),
          email: t("profile.email"),
          phone: t("profile.phone"),
          organization: t("profile.organization"),
          address: t("profile.address"),
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
        },
        addEmployee: {
          button: t("addEmployee.button"),
          firstNameLabel: t("addEmployee.firstNameLabel"),
          lastNameLabel: t("addEmployee.lastNameLabel"),
          emailLabel: t("addEmployee.emailLabel"),
          phoneLabel: t("addEmployee.phoneLabel"),
          passwordLabel: t("addEmployee.passwordLabel"),
          submit: t("addEmployee.submit"),
          cancel: t("addEmployee.cancel"),
          error: t("addEmployee.error"),
        },
      }}
    />
  );
}
