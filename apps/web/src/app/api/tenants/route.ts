import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const tenant = await apiFetch("/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(tenant);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
