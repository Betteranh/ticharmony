import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  const query = tenantId ? `?tenantId=${tenantId}` : "";
  try {
    const ticket = await apiFetch(`/tickets/${id}${query}`, { method: "PATCH", body: JSON.stringify(body) });
    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}