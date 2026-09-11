import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function PATCH(request: Request) {
  const body = await request.json();
  try {
    const user = await apiFetch("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof ApiError) {
      let message = err.message;
      try {
        message = (JSON.parse(err.message) as { message?: string }).message ?? err.message;
      } catch {
        // Not JSON — fall back to the raw text as-is.
      }
      return NextResponse.json({ error: message }, { status: err.status });
    }
    throw err;
  }
}
