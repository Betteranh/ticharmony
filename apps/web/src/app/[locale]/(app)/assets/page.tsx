import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api";
import { listClientTenants } from "@/lib/directory";
import { AssetsClientsView } from "@/components/assets/assets-clients-view";

export default async function AssetsPage() {
  const [t, tenants] = await Promise.all([
    getTranslations("assets"),
    listClientTenants().catch((err) => {
      if (err instanceof ApiError && err.status === 403) return null;
      throw err;
    }),
  ]);

  if (tenants === null) notFound();

  return (
    <AssetsClientsView
      tenants={tenants.map((tenant) => ({
        ...tenant,
        usersCountLabel: t("usersCount", { count: tenant.userCount }),
      }))}
      labels={{
        pageTitle: t("pageTitle"),
        clientsSubtitle: t("clientsSubtitle"),
        clientsSearchPlaceholder: t("clientsSearchPlaceholder"),
        emptyClients: t("emptyClients"),
        clientsNoResults: t("clientsNoResults"),
      }}
    />
  );
}
