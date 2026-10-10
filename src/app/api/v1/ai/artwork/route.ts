import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { PHOTO_BUCKET, getAdminClient } from "@/lib/supabase/admin";

// Makes decorative artwork for the invite from the host's words, saves it as a normal invite photo.
// Uses OpenAI's image API (set OPENAI_API_KEY). Without a key the route answers 503 and the app hides nothing else.
const bodySchema = z.object({
  prompt: z.string().trim().min(3).max(300),
  occasion: z.string().max(40).optional(),
});

const GUARD =
  "Decorative invitation background artwork, beautiful, warm and festive, painterly illustration or soft photography style. " +
  "No text, no letters, no logos, no watermarks. No recognisable real people or faces. Leave calm space in the middle for text. Subject: ";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`art:min:${ip}`, 3, 60_000) || !rateLimit(`art:hour:${ip}`, 8, 3_600_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });

  try {
    const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com"}/v1/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.IMAGE_MODEL || "gpt-image-1",
        prompt: GUARD + parsed.data.prompt + (parsed.data.occasion ? ` (for a ${parsed.data.occasion} invitation, Indian family celebration)` : ""),
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error("image api", res.status);
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    const body = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "ai_failed" }, { status: 502 });

    const jpeg = await sharp(Buffer.from(b64, "base64")).resize(1400, 1400, { fit: "inside" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const path = `drafts/${crypto.randomUUID()}.jpg`;
    const { error } = await getAdminClient().storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: "image/jpeg" });
    if (error) {
      console.error("artwork upload", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ path });
  } catch (e) {
    console.error("artwork failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
