import { apiFetch } from "@/lib/api";
import type { TenantUser, UserRole } from "@/lib/types";

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  department?: string;
  location?: string;
  phone?: string;
  roles: UserRole[];
}

export async function listUsers(): Promise<TenantUser[]> {
  return apiFetch<TenantUser[]>("/users");
}
