import { apiFetch } from "@/lib/api";
import type { ClientTenant, DirectoryUser } from "@/lib/types";

interface ApiClientTenant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  companyNumber: string | null;
  active: boolean;
  createdAt: string;
  userCount: number;
}

export async function listClientTenants(): Promise<ClientTenant[]> {
  const tenants = await apiFetch<ApiClientTenant[]>("/tenants/clients");
  return tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    address: tenant.address,
    companyNumber: tenant.companyNumber,
    active: tenant.active,
    userCount: tenant.userCount,
    createdAt: tenant.createdAt,
  }));
}

export async function listClientUsers(tenantId: string): Promise<DirectoryUser[]> {
  return apiFetch<DirectoryUser[]>(`/tenants/${tenantId}/users`);
}
