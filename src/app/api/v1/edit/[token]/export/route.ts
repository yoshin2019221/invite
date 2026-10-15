import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

// Guest-typed text must not run as a spreadsheet formula when the host opens the file.
function cell(value: string | number | null | undefined) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });
  if (!rateLimit(`edit:${clientIp(request)}`, 30, 60_000)) {
    return new Response("Too many requests", { status: 429 });
  }
  const db = getAdminClient();
  const { data: event } = await db
    .from("events")
    .select("id, slug")
    .eq("edit_token_hash", hashToken(token))
    .maybeSingle();
  if (!event) return new Response("Not found", { status: 404 });

  const [{ data: replies }, { data: households }] = await Promise.all([
    db
      .from("rsvps")
      .select("guest_name, status, headcount, note, household_id, updated_at")
      .eq("event_id", event.id)
      .order("updated_at", { ascending: true }),
    db.from("households").select("id, name").eq("event_id", event.id),
  ]);

  const rows = [["Name", "Answer", "People", "Note", "Replied at"]];
  const replied = new Set<string>();
  for (const r of replies ?? []) {
    if (r.household_id) replied.add(r.household_id);
    rows.push([r.guest_name, r.status, String(r.headcount), r.note ?? "", r.updated_at]);
  }
  for (const h of households ?? []) {
    if (!replied.has(h.id)) rows.push([h.name, "no reply yet", "", "", ""]);
  }

  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="guests-${event.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
