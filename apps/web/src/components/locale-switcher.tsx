"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 rounded-full border border-hairline bg-surface p-0.5 font-mono text-[11px] uppercase">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            l === locale
              ? "bg-accent text-canvas font-semibold"
              : "text-text-tertiary hover:text-text-primary"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
