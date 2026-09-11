"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";

interface Labels {
  newClient: string;
  form: Record<"nameLabel" | "addressLabel" | "companyNumberLabel" | "create" | "cancel", string>;
}

export function CreateClientTenantButton({ labels }: { labels: Labels }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong"
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
  const [address, setAddress] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type: "CLIENT",
        address: address.trim() || undefined,
        companyNumber: companyNumber.trim() || undefined,
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
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.addressLabel}</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.form.companyNumberLabel}</span>
          <input
            value={companyNumber}
            onChange={(e) => setCompanyNumber(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

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
