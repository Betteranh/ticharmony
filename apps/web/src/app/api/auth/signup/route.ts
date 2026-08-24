import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();

  const apiRes = await fetch(`${process.env.API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    const status = apiRes.status === 409 ? 409 : 400;
    return NextResponse.json({ error: "signup_failed" }, { status });
  }

  const { accessToken, refreshToken } = await apiRes.json();
  const cookieStore = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, { ...common, maxAge: 60 * 15 });
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...common, maxAge: 60 * 60 * 24 * 7 });

  return NextResponse.json({ ok: true });
}