import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; userId: string; licenseId: string }> },
) {
  const { tenantId, userId, licenseId } = await params;
  try {
    const result = await apiFetch(
      `/tenants/${tenantId}/users/${userId}/licenses/${licenseId}`,
      { method: "DELETE" },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
