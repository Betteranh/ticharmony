import type { DirectoryUser } from "@/lib/types";

export interface DirectoryMock {
  lastLoginAt: string;
}

function hashCode(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getDirectoryMock(user: DirectoryUser): DirectoryMock {
  const h = hashCode(user.id);
  return {
    lastLoginAt: new Date(Date.now() - (h % 30) * 86_400_000).toISOString(),
  };
}
