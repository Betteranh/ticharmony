import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";

// Multipart forward: reparsed into a fresh FormData rather than reusing
// apiFetch, which always forces a JSON Content-Type when a body is present.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { id, commentId } = await params;
  const formData = await request.formData();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  const query = tenantId ? `?tenantId=${tenantId}` : "";

  const apiRes = await fetch(
    `${process.env.API_URL}/tickets/${id}/comments/${commentId}/attachments${query}`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    },
  );

  if (!apiRes.ok) {
    return NextResponse.json({ error: await apiRes.text() }, { status: apiRes.status });
  }
  return NextResponse.json(await apiRes.json());
}
