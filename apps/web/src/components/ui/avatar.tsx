import type { Person, UserRole } from "@/lib/types";

const ROLE_RING: Record<UserRole, string> = {
  SUPER_ADMIN: "ring-accent/50",
  ADMIN: "ring-accent/50",
  AGENT: "ring-status-in-progress/50",
  CUSTOMER: "ring-hairline-strong",
};

// A person can hold several roles at once (e.g. technician + admin); the ring
// color only needs one, so we pick by precedence — purely cosmetic, not authoritative.
const ROLE_PRECEDENCE: UserRole[] = ["SUPER_ADMIN", "ADMIN", "AGENT", "CUSTOMER"];

function primaryRole(roles: UserRole[]): UserRole {
  return ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? roles[0];
}

export function Avatar({ person, size = "md" }: { person: Person; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  const ring = ROLE_RING[primaryRole(person.roles)];
  if (person.avatar) {
    return (
      <span
        className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full bg-surface-raised ring-1 ${ring}`}
        title={`${person.firstName} ${person.lastName}`}
      >
        {person.avatar}
      </span>
    );
  }

  const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
  const fallbackDim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={`inline-flex ${fallbackDim} shrink-0 items-center justify-center rounded-full bg-surface-raised font-mono font-semibold text-text-secondary ring-1 ${ring}`}
      title={`${person.firstName} ${person.lastName}`}
    >
      {initials}
    </span>
  );
}
