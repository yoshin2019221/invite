import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { PHOTO_BUCKET, getAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { updateEventSchema } from "@/lib/validation";

// The host changes invite details using the private edit token (no login).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!rateLimit(`edit:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const i = parsed.data;

  const { data, error } = await getAdminClient()
    .from("events")
    .update({
      title: i.title,
      host_names: i.hostNames,
      starts_at: i.startsAt,
      venue_name: i.venueName ?? null,
      address: i.address ?? null,
      map_url: i.mapUrl ?? null,
      message: i.message ?? null,
      theme: i.theme,
    })
    .eq("edit_token_hash", hashToken(token))
    .select("slug");
  if (error) {
    console.error("update event failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Permanently deletes the invite, its replies and its photo.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!rateLimit(`edit:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const db = getAdminClient();
  const { data } = await db
    .from("events")
    .select("id, photo_path")
    .eq("edit_token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (data.photo_path) {
    await db.storage.from(PHOTO_BUCKET).remove([data.photo_path]);
  }
  const { error } = await db.from("events").delete().eq("id", data.id);
  if (error) {
    console.error("delete event failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
