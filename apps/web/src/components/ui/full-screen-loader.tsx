import Image from "next/image";
import { createPortal } from "react-dom";

export function FullScreenLoader({ label }: { label: string }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-canvas">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline bg-surface shadow-lg shadow-black/40 animate-pulse-dot">
        <Image
          src="/brand/tic-harmony-logo.png"
          alt="TIC Harmony"
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
      </div>
      <p className="text-sm text-text-secondary">{label}</p>
    </div>,
    document.body,
  );
}
