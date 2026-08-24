import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  const { tenantId, userId } = await params;
  const body = await request.json();
  try {
    const license = await apiFetch(`/tenants/${tenantId}/users/${userId}/licenses`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(license);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
