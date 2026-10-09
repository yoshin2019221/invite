import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";

// A personal link opens the invite with the household's name filled in, plus any earlier reply.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!/^[a-z0-9]{4,32}$/.test(slug) || !/^[A-Za-z0-9_-]{8,32}$/.test(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!rateLimit(`hh:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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
  const { data: household } = await db
    .from("households")
    .select("id, name")
    .eq("event_id", event.id)
    .eq("link_token", token)
    .maybeSingle();
  if (!household) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: reply } = await db
    .from("rsvps")
    .select("guest_name, status, headcount, note")
    .eq("household_id", household.id)
    .maybeSingle();

  return NextResponse.json(
    { name: household.name, reply: reply ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
