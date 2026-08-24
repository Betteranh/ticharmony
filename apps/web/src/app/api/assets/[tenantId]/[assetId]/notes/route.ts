import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; assetId: string }> },
) {
  const { tenantId, assetId } = await params;
  const body = await request.json();
  try {
    const note = await apiFetch(`/assets/${tenantId}/${assetId}/notes`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(note);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
