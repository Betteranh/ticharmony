import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function PATCH() {
  try {
    const result = await apiFetch("/notifications/read-all", { method: "PATCH" });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
