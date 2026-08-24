"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { Ticket } from "@/lib/types";

const PRIORITY_OPTIONS: Ticket["priority"][] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority }),
    });
    setSubmitting(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">Nouveau ticket</h2>
          <button onClick={onClose} className="rounded-md p-1 text-text-tertiary hover:bg-surface-raised hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Titre</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Description</span>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Priorité</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Ticket["priority"])}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-70"
          >
            Créer le ticket
          </button>
        </form>
      </div>
    </div>
  );
}