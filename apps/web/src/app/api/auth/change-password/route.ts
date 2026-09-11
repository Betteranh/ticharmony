import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await apiFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      // The API returns Nest's default JSON error shape ({message, error,
      // statusCode}) as raw text — surface just the human-readable message,
      // not the whole blob.
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
