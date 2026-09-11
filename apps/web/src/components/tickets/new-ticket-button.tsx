"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewTicketDialog } from "./new-ticket-dialog";

export function NewTicketButton({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {label}
      </button>
      {show && <NewTicketDialog onClose={() => setShow(false)} />}
    </>
  );
}
