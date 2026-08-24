import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await params;
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  const query = tenantId ? `?tenantId=${tenantId}` : "";

  const apiRes = await fetch(`${process.env.API_URL}/tickets/${id}/attachments/${attachmentId}${query}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: "no-store",
  });

  if (!apiRes.ok || !apiRes.body) {
    return NextResponse.json({ error: "not_found" }, { status: apiRes.status || 404 });
  }

  const headers = new Headers();
  const contentType = apiRes.headers.get("content-type");
  const contentDisposition = apiRes.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (contentDisposition) headers.set("content-disposition", contentDisposition);

  return new NextResponse(apiRes.body, { status: 200, headers });
}
