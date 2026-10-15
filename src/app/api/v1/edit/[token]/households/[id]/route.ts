import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

// Removes one household (and its reply) from the host's list.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token) || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!rateLimit(`edit:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const db = getAdminClient();
  const { data: event } = await db
    .from("events")
    .select("id")
    .eq("edit_token_hash", hashToken(token))
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The reply goes first: rsvps.household_id is "on delete set null", which would orphan it.
  await db.from("rsvps").delete().eq("event_id", event.id).eq("household_id", id);
  const { error } = await db.from("households").delete().eq("event_id", event.id).eq("id", id);
  if (error) {
    console.error("delete household failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
