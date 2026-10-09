import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { verifyTurnstile } from "@/lib/turnstile";
import { rsvpRequestSchema } from "@/lib/validation";

const MAX_REPLIES_PER_EVENT = 1000;

// A household sends (or changes) its reply. No login: the device token in the body
// identifies the same device on a later visit, and only its hash is stored.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9]{4,32}$/.test(slug)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ip = clientIp(request);
  if (!rateLimit(`rsvp-m:${ip}`, 8, 60_000) || !rateLimit(`rsvp-h:${ip}`, 40, 3_600_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = rsvpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const input = parsed.data;

  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return NextResponse.json({ error: "bot_check_failed" }, { status: 403 });
  }

  const db = getAdminClient();
  const { data: event } = await db
    .from("events")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!event || event.status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = {
    guest_name: input.guestName,
    status: input.status,
    headcount: input.status === "not_coming" ? 0 : input.headcount,
    note: input.note || null,
  };
  const deviceHash = hashToken(input.deviceToken);

  async function update() {
    return db
      .from("rsvps")
      .update(row)
      .eq("event_id", event!.id)
      .eq("device_token_hash", deviceHash)
      .select("id");
  }

  const first = await update();
  if (first.error) {
    console.error("rsvp update failed", first.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (first.data.length > 0) return NextResponse.json({ ok: true, updated: true });

  const { count } = await db
    .from("rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);
  if ((count ?? 0) >= MAX_REPLIES_PER_EVENT) {
    return NextResponse.json({ error: "event_full" }, { status: 409 });
  }

  const { error } = await db
    .from("rsvps")
    .insert({ ...row, event_id: event.id, device_token_hash: deviceHash });
  if (error) {
    if (error.code === "23505") {
      // Two taps at once: the other request inserted first, so change that one.
      await update();
      return NextResponse.json({ ok: true, updated: true });
    }
    console.error("rsvp insert failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: false }, { status: 201 });
}
