import { NextResponse } from "next/server";
import { getAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";

// Development-only setup check. Open http://localhost:3000/api/v1/health
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    secretKey: Boolean(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  };

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.secretKey) {
    return NextResponse.json({
      ok: false,
      env,
      hint: "Add the missing key to .env.local (plain text) and restart npm run dev.",
    });
  }

  const supabase = getAdminClient();
  const tables: Record<string, string> = {};
  for (const table of ["events", "households", "rsvps"]) {
    const { error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    tables[table] = error ? `error: ${error.message}` : "ok";
  }

  const { data: bucket, error: bucketError } =
    await supabase.storage.getBucket(PHOTO_BUCKET);
  const storage = bucketError
    ? `error: ${bucketError.message}`
    : bucket.public
      ? "ok (public)"
      : "bucket exists but is not public";

  const ok =
    Object.values(tables).every((v) => v === "ok") && storage.startsWith("ok");
  return NextResponse.json({ ok, env, tables, storage });
}
