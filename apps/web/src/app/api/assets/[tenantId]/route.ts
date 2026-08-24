import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const body = await request.json();
  try {
    const asset = await apiFetch(`/assets/${tenantId}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(asset);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
