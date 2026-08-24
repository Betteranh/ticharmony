import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { listAssets } from "@/lib/assets";
import { listClientTenants, listClientUsers } from "@/lib/directory";
import { AssetsView } from "@/components/assets/assets-view";

export default async function TenantAssetsPage({
  params,
}: {
  params: Promise<{ tenantId: string; locale: string }>;
}) {
  const { tenantId, locale } = await params;

  const [currentUser, tenants, assets, users] = await Promise.all([
    getSession(),
    listClientTenants(),
    listAssets(tenantId).catch((err) => {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;
      throw err;
    }),
    listClientUsers(tenantId).catch(() => []),
  ]);

  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant || assets === null || !currentUser) notFound();

  const canManage = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");

  return (
    <AssetsView
      tenantId={tenantId}
      tenantName={tenant.name}
      assets={assets}
      users={users}
      locale={locale}
      canManage={canManage}
    />
  );
}
