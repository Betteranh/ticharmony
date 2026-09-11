"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronRight, Search, Users as UsersIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ClientTenant } from "@/lib/types";
import { CreateClientTenantButton } from "@/components/directory/create-client-tenant-dialog";

interface ClientTenantRow extends ClientTenant {
  usersCountLabel: string;
}

interface Labels {
  pageTitle: string;
  clientsSubtitle: string;
  searchPlaceholder: string;
  empty: string;
  noResults: string;
  newClient: string;
  form: Record<"nameLabel" | "addressLabel" | "companyNumberLabel" | "create" | "cancel", string>;
}

export function DirectoryClientsView({
  tenants,
  canCreateTenant,
  labels,
}: {
  tenants: ClientTenantRow[];
  canCreateTenant: boolean;
  labels: Labels;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? tenants.filter((tenant) => tenant.name.toLowerCase().includes(q))
      : tenants;
    // Disabled companies sink to the bottom, alphabetical order preserved
    // otherwise (stable sort) — same treatment as employees within a company.
    return [...matches].sort((a, b) => Number(!a.active) - Number(!b.active));
  }, [tenants, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            {labels.pageTitle}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{labels.clientsSubtitle}</p>
        </div>
        {canCreateTenant && (
          <CreateClientTenantButton
            labels={{ newClient: labels.newClient, form: labels.form }}
          />
        )}
      </div>

      {tenants.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface p-2">
          <div className="flex flex-1 items-center gap-2 px-2">
            <Search className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
          </div>
        </div>
      )}

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {labels.empty}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {labels.noResults}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/directory/${tenant.id}`}
              className={`group flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3.5 transition-colors hover:border-hairline-strong hover:bg-surface-raised ${
                tenant.active ? "" : "opacity-50"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-secondary">
                  <Building2 className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-text-primary">{tenant.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-text-tertiary">
                    <UsersIcon className="h-3 w-3" strokeWidth={1.75} />
                    {tenant.usersCountLabel}
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
