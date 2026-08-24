import { cookies } from "next/headers";
import type { Person } from "@/lib/types";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export async function getSession(): Promise<Person | null> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return null;
  }

  const res = await fetch(`${process.env.API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const user = await res.json();
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    roles: user.roles,
    email: user.email,
  };
}