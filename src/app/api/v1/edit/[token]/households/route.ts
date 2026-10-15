import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken, makeLinkToken } from "@/lib/tokens";
import { addHouseholdsSchema } from "@/lib/validation";

const MAX_HOUSEHOLDS = 300;

// The host adds households (one personal link each).
export async function POST(
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
  const parsed = addHouseholdsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const db = getAdminClient();
  const { data: event } = await db
    .from("events")
    .select("id")
    .eq("edit_token_hash", hashToken(token))
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { count } = await db
    .from("households")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);
  if ((count ?? 0) + parsed.data.names.length > MAX_HOUSEHOLDS) {
    return NextResponse.json({ error: "too_many" }, { status: 409 });
  }

  const { error } = await db.from("households").insert(
    parsed.data.names.map((name) => ({
      event_id: event.id,
      name,
      link_token: makeLinkToken(),
    })),
  );
  if (error) {
    console.error("add households failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
