"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";

interface Labels {
  newClient: string;
  form: Record<
    | "nameLabel"
    | "slugLabel"
    | "slugHint"
    | "addressLabel"
    | "adminSectionTitle"
    | "adminFirstNameLabel"
    | "adminLastNameLabel"
    | "adminEmailLabel"
    | "adminDepartmentLabel"
    | "adminLocationLabel"
    | "adminPhoneLabel"
    | "adminPasswordLabel"
    | "create"
    | "cancel",
    string
  >;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateClientTenantButton({ labels }: { labels: Labels }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        {labels.newClient}
      </button>
      {open && <CreateClientTenantDialog labels={labels} onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateClientTenantDialog({ labels, onClose }: { labels: Labels; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminDepartment, setAdminDepartment] = useState("");
  const [adminLocation, setAdminLocation] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        type: "CLIENT",
        address: address.trim() || undefined,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminDepartment: adminDepartment.trim() || undefined,
        adminLocation: adminLocation.trim() || undefined,
        adminPhone: adminPhone.trim() || undefined,
        adminPassword,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      onClose();
      router.refresh();
    }
  }

  return (
    <Modal title={labels.newClient} onClose={onClose} widthClass="w-[440px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.nameLabel}</span>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.slugLabel}</span>
          <input
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent/60"
          />
          <span className="text-xs text-text-tertiary">{labels.form.slugHint}</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.addressLabel}</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <span className="text-xs font-medium text-text-secondary">{labels.form.adminSectionTitle}</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{labels.form.adminFirstNameLabel}</span>
              <input
                required
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{labels.form.adminLastNameLabel}</span>
              <input
                required
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.form.adminEmailLabel}</span>
            <input
              required
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{labels.form.adminDepartmentLabel}</span>
              <input
                value={adminDepartment}
                onChange={(e) => setAdminDepartment(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{labels.form.adminLocationLabel}</span>
              <input
                value={adminLocation}
                onChange={(e) => setAdminLocation(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.form.adminPhoneLabel}</span>
            <input
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{labels.form.adminPasswordLabel}</span>
            <input
              required
              type="password"
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-hairline px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
          >
            {labels.form.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {labels.form.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}
