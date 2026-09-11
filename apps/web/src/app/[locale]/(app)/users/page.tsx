import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { apiFetch, ApiError } from "@/lib/api";
import { listUsers } from "@/lib/users";
import type { UserRole } from "@/lib/types";
import { UsersView } from "@/components/users/users-view";

interface CurrentUserContext {
  id: string;
  roles: UserRole[];
  tenant: { type: "INTERNAL" | "CLIENT" };
}

const ASSIGNABLE_ROLES_BY_TENANT_TYPE: Record<"INTERNAL" | "CLIENT", UserRole[]> = {
  INTERNAL: ["AGENT", "ADMIN"],
  CLIENT: ["CUSTOMER"],
};

export default async function UsersPage() {
  const [t, currentUser, users] = await Promise.all([
    getTranslations("users"),
    apiFetch<CurrentUserContext>("/auth/me"),
    listUsers().catch((err) => {
      if (err instanceof ApiError && err.status === 403) return null;
      throw err;
    }),
  ]);

  if (users === null) notFound();

  const canManage = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const assignableRoles = ASSIGNABLE_ROLES_BY_TENANT_TYPE[currentUser.tenant.type];

  return (
    <UsersView
      users={users}
      canManage={canManage}
      currentUserId={currentUser.id}
      assignableRoles={assignableRoles}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        searchPlaceholder: t("searchPlaceholder"),
        columns: {
          name: t("columns.name"),
          email: t("columns.email"),
          roles: t("columns.roles"),
          status: t("columns.status"),
        },
        empty: t("empty"),
        noResults: t("noResults"),
        newUser: t("newUser"),
        form: {
          firstNameLabel: t("form.firstNameLabel"),
          lastNameLabel: t("form.lastNameLabel"),
          emailLabel: t("form.emailLabel"),
          phoneLabel: t("form.phoneLabel"),
          passwordLabel: t("form.passwordLabel"),
          rolesLabel: t("form.rolesLabel"),
          create: t("form.create"),
          cancel: t("form.cancel"),
        },
        role: {
          SUPER_ADMIN: t("role.SUPER_ADMIN"),
          ADMIN: t("role.ADMIN"),
          AGENT: t("role.AGENT"),
          CUSTOMER: t("role.CUSTOMER"),
        },
        status: {
          ACTIVE: t("status.ACTIVE"),
          INVITED: t("status.INVITED"),
          DISABLED: t("status.DISABLED"),
        },
        edit: {
          button: t("edit.button"),
          save: t("edit.save"),
          cancel: t("edit.cancel"),
          error: t("edit.error"),
          disable: t("edit.disable"),
          enable: t("edit.enable"),
          cannotDisableSelf: t("edit.cannotDisableSelf"),
        },
        detail: {
          employeeCode: t("detail.employeeCode"),
        },
      }}
    />
  );
}
