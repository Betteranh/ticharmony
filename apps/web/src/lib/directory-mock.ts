import type { DirectoryUser } from "@/lib/types";

const TITLES = [
  "Software Developer",
  "Support Specialist",
  "Sales Manager",
  "Marketing Coordinator",
  "HR Generalist",
  "Accountant",
  "Office Manager",
  "IT Technician",
  "Product Manager",
  "Customer Success Manager",
];

const GROUP_CATALOG = ["Engineering", "GitHub-Access", "VPN-Users", "Finance-ReadOnly", "Marketing", "Sales-CRM"];

export interface DirectoryMock {
  employeeId: string;
  title: string;
  lastLoginAt: string;
  mfaEnrolled: boolean;
  passwordExpired: boolean;
  groups: string[];
}

function hashCode(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

function nextSeed(seed: number): number {
  return (seed * 1103515245 + 12345) >>> 0;
}

function pick<T>(catalog: T[], seed: number, count: number): T[] {
  const items = [...catalog];
  const out: T[] = [];
  let s = seed;
  for (let i = 0; i < count && items.length > 0; i++) {
    s = nextSeed(s);
    const idx = s % items.length;
    out.push(items.splice(idx, 1)[0]);
  }
  return out;
}

export function getDirectoryMock(user: DirectoryUser): DirectoryMock {
  const h = hashCode(user.id);
  return {
    employeeId: `EMP-${1000 + (h % 9000)}`,
    title: TITLES[h % TITLES.length],
    lastLoginAt: new Date(Date.now() - (h % 30) * 86_400_000).toISOString(),
    mfaEnrolled: h % 5 !== 0,
    passwordExpired: h % 7 === 0,
    groups: ["Domain Users", ...pick(GROUP_CATALOG, h, 1 + (h % 3))],
  };
}
