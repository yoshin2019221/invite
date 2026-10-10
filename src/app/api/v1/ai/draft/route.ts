import { NextResponse } from "next/server";
import { z } from "zod";
import { AiUnavailable, extractInvite, missingQuestions } from "@/lib/ai-draft";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  text: z.string().trim().max(1500),
  image: z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(2_000_000) }).optional(),
}).refine((v) => v.text.length > 0 || v.image, { message: "empty" });

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`ai:min:${ip}`, 6, 60_000) || !rateLimit(`ai:hour:${ip}`, 25, 3_600_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    const draft = await extractInvite(parsed.data.text, parsed.data.image);
    return NextResponse.json({ draft, questions: missingQuestions(draft) });
  } catch (e) {
    if (e instanceof AiUnavailable) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    console.error("ai draft failed", e);
    return NextResponse.json({ error: "ai_failed", code: e instanceof Error ? e.message : "unknown" }, { status: 502 });
  }
}
