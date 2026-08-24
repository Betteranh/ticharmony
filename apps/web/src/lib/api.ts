import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;

  const res = await fetch(`${process.env.API_URL}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return res.json();
}