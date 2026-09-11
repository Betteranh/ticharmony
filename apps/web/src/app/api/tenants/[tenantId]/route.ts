import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const body = await request.json();
  try {
    const tenant = await apiFetch(`/tenants/${tenantId}`, {
      method: "PATCH",
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
