import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Building2, ChevronRight, Users as UsersIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { listClientTenants } from "@/lib/directory";
import { CreateClientTenantButton } from "@/components/directory/create-client-tenant-dialog";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{t("clientsSubtitle")}</p>
        </div>
        {canCreateTenant && (
          <CreateClientTenantButton
            labels={{
              newClient: t("newClient"),
              form: {
                nameLabel: t("form.nameLabel"),
                slugLabel: t("form.slugLabel"),
                slugHint: t("form.slugHint"),
                addressLabel: t("form.addressLabel"),
                adminSectionTitle: t("form.adminSectionTitle"),
                adminFirstNameLabel: t("form.adminFirstNameLabel"),
                adminLastNameLabel: t("form.adminLastNameLabel"),
                adminEmailLabel: t("form.adminEmailLabel"),
                adminDepartmentLabel: t("form.adminDepartmentLabel"),
                adminLocationLabel: t("form.adminLocationLabel"),
                adminPhoneLabel: t("form.adminPhoneLabel"),
                adminPasswordLabel: t("form.adminPasswordLabel"),
                create: t("form.create"),
                cancel: t("form.cancel"),
              },
            }}
          />
        )}
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/directory/${tenant.id}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3.5 transition-colors hover:border-hairline-strong hover:bg-surface-raised"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-secondary">
                  <Building2 className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-text-primary">{tenant.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-text-tertiary">
                    <UsersIcon className="h-3 w-3" strokeWidth={1.75} />
                    {t("usersCount", { count: tenant.userCount })}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
