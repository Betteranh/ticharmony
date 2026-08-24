"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  icon,
  title,
  badge,
  onClose,
  children,
  widthClass = "w-[420px]",
}: {
  icon?: React.ReactNode;
  title: string;
  badge?: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-28 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-rise-in max-h-[80vh] overflow-hidden rounded-xl border border-hairline bg-surface shadow-2xl shadow-black/50 ${widthClass}`}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-primary">
            {icon}
            {title}
            {badge && (
              <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-text-tertiary">
                {badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[calc(80vh-56px)] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
