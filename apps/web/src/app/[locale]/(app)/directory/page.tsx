import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { listClientTenants } from "@/lib/directory";
import { DirectoryClientsView } from "@/components/directory/directory-clients-view";

export default async function DirectoryPage() {
  const [t, currentUser, tenants] = await Promise.all([
    getTranslations("directory"),
    getSession(),
    listClientTenants().catch((err) => {
      if (err instanceof ApiError && err.status === 403) return null;
      throw err;
    }),
  ]);

  if (tenants === null) notFound();

  const canCreateTenant = currentUser?.roles.includes("SUPER_ADMIN") ?? false;
  const rows = tenants.map((tenant) => ({
    ...tenant,
    usersCountLabel: t("usersCount", { count: tenant.userCount }),
  }));

  return (
    <DirectoryClientsView
      tenants={rows}
      canCreateTenant={canCreateTenant}
      labels={{
        pageTitle: t("pageTitle"),
        clientsSubtitle: t("clientsSubtitle"),
        searchPlaceholder: t("clientsSearchPlaceholder"),
        empty: t("empty"),
        noResults: t("noClientResults"),
        newClient: t("newClient"),
        form: {
          nameLabel: t("form.nameLabel"),
          addressLabel: t("form.addressLabel"),
          companyNumberLabel: t("form.companyNumberLabel"),
          create: t("form.create"),
          cancel: t("form.cancel"),
        },
      }}
    />
  );
}
