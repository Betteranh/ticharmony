import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; assetId: string; noteId: string }> },
) {
  const { tenantId, assetId, noteId } = await params;
  const body = await request.json();
  try {
    const note = await apiFetch(`/assets/${tenantId}/${assetId}/notes/${noteId}`, {
      method: "PATCH",
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; assetId: string; noteId: string }> },
) {
  const { tenantId, assetId, noteId } = await params;
  try {
    const result = await apiFetch(`/assets/${tenantId}/${assetId}/notes/${noteId}`, {
      method: "DELETE",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
