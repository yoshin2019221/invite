import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken, makeEditToken, makeSlug } from "@/lib/tokens";
import { createEventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const editToken = makeEditToken();
  const supabase = getAdminClient();

  // Retry a few times in the very unlikely case of a slug collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = makeSlug();
    const { error } = await supabase.from("events").insert({
      slug,
      occasion: input.occasion,
      title: input.title,
      host_names: input.hostNames,
      starts_at: input.startsAt,
      timezone: input.timezone,
      venue_name: input.venueName ?? null,
      address: input.address ?? null,
      map_url: input.mapUrl ?? null,
      message: input.message ?? null,
      details: input.rich ? { rich: input.rich } : {},
      template: input.template,
      theme: input.theme,
      language: input.language,
      photo_path: input.photoPath ?? null,
      edit_token_hash: hashToken(editToken),
    });

    if (!error) {
      return NextResponse.json({ slug, editToken }, { status: 201 });
    }
    if (error.code !== "23505") {
      console.error("create event failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
