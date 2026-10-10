import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { PHOTO_BUCKET, getAdminClient } from "@/lib/supabase/admin";

// Image generation can take 30-40s, so give the function room before the platform cuts it off.
export const maxDuration = 120;

// Makes invitation artwork with OpenAI's image model (set OPENAI_API_KEY) and saves it as a normal invite photo.
// Two modes:
//  - card: designs a COMPLETE invitation card with the real names/date/venue drawn into it. If the host gave a
//    sample invite they like, it is sent as a style reference so the result looks like the same designer made it.
//    The saved image is used full-bleed as the invite hero (rich.heroFullCard).
//  - background: the older simple decorative background from a short phrase (manual "describe a picture" box).
// Without a key the route answers 503 and nothing else in the app breaks.

const cardSchema = z.object({
  title: z.string().trim().max(120).optional(),
  hostNames: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(40).optional(),
  dateText: z.string().trim().max(60).optional(),
  timeText: z.string().trim().max(40).optional(),
  venue: z.string().trim().max(160).optional(),
  message: z.string().trim().max(240).optional(),
  style: z.string().trim().max(400).optional(),
  language: z.enum(["en", "hi"]).optional(),
});

const bodySchema = z.object({
  // simple background mode
  prompt: z.string().trim().min(3).max(300).optional(),
  occasion: z.string().max(40).optional(),
  // full-card mode
  card: cardSchema.optional(),
  // A sample invite the host likes, used as a style reference.
  reference: z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(3_000_000) }).optional(),
});

const BG_GUARD =
  "Decorative invitation background artwork, beautiful, warm and festive, painterly illustration or soft photography style. " +
  "No text, no letters, no logos, no watermarks. No recognisable real people or faces. Leave calm space in the middle for text. Subject: ";

function cardPrompt(c: z.infer<typeof cardSchema>, hasSample: boolean): string {
  const lang = c.language === "hi" ? "Hindi (Devanagari script)" : "English";
  const lines: string[] = [];
  if (c.title) lines.push(`Headline / names: ${c.title}`);
  if (c.hostNames) lines.push(`Hosted by: ${c.hostNames}`);
  if (c.dateText) lines.push(`Date: ${c.dateText}`);
  if (c.timeText) lines.push(`Time: ${c.timeText}`);
  if (c.venue) lines.push(`Venue: ${c.venue}`);
  if (c.message) lines.push(`Short line: ${c.message}`);
  const occ = c.occasion ? `${c.occasion} ` : "";
  return (
    `Design ONE complete, finished, print-ready ${occ}invitation card for an Indian family celebration — ` +
    `a single elegant portrait card that looks hand-designed by a professional invitation studio, ` +
    `with the decoration and the words composed together as one artwork (NOT a photo with text pasted on top). ` +
    (hasSample
      ? "Match the visual style, colour palette, decorative motifs, borders and overall mood of the attached reference image, as if the same designer made this card. Do NOT copy any names, dates or wording from the reference — use ONLY the details below. "
      : (c.style ? `Visual style: ${c.style}. ` : "Elegant, warm, festive Indian style with tasteful ornamentation. ")) +
    `Render ALL of the following text neatly and clearly, woven into the design, spelled EXACTLY as written, in ${lang}:\n` +
    lines.join("\n") +
    `\nEvery word must be clearly legible with beautiful typography and good contrast against its background. ` +
    `Use ornamental borders, motifs and flourishes that frame the text. ` +
    `No people or faces, no photographs of real people, no watermarks, no extra or placeholder text — only the details listed above.`
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`art:min:${ip}`, 3, 60_000) || !rateLimit(`art:hour:${ip}`, 8, 3_600_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { prompt, occasion, card, reference } = parsed.data;
  if (!card && !prompt) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
  const model = process.env.IMAGE_MODEL || "gpt-image-2";
  const isCard = !!card;
  // Cards carry text, so they need more detail; a plain background can stay cheap.
  const quality = isCard ? process.env.IMAGE_CARD_QUALITY || "medium" : "low";
  const size = isCard ? "1024x1536" : "1024x1024"; // portrait card vs square background

  // Generate from a text prompt only (images/generations, JSON).
  async function generate(finalPrompt: string): Promise<string | undefined> {
    const res = await fetch(`${base}/v1/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: finalPrompt, size, quality, n: 1 }),
      signal: AbortSignal.timeout(115_000),
    });
    if (!res.ok) {
      console.error("image gen api", res.status, (await res.text().catch(() => "")).slice(0, 300));
      throw new Error(`gen_${res.status}`);
    }
    return ((await res.json()) as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
  }

  // Generate using the sample as a visual reference (images/edits, multipart). gpt-image models expect image[].
  async function editFromReference(finalPrompt: string, ref: NonNullable<typeof reference>): Promise<string | undefined> {
    const bytes = Buffer.from(ref.data, "base64");
    const ext = ref.mediaType === "image/png" ? "png" : ref.mediaType === "image/webp" ? "webp" : "jpg";
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", finalPrompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    form.append("image[]", new Blob([new Uint8Array(bytes)], { type: ref.mediaType }), `sample.${ext}`);
    const res = await fetch(`${base}/v1/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(115_000),
    });
    if (!res.ok) {
      console.error("image edit api", res.status, (await res.text().catch(() => "")).slice(0, 300));
      throw new Error(`edit_${res.status}`);
    }
    return ((await res.json()) as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
  }

  try {
    let b64: string | undefined;
    const cardText = isCard ? cardPrompt(card, !!reference) : BG_GUARD + prompt + (occasion ? ` (for a ${occasion} invitation, Indian family celebration)` : "");

    if (reference) {
      try {
        b64 = await editFromReference(cardText, reference);
      } catch (e) {
        // The edit endpoint can reject some images/models. Rather than fail, fall back to a plain
        // generation — the sample's look still comes through via the style text the describe step wrote.
        console.error("edit failed, falling back to generate", e instanceof Error ? e.message : e);
        b64 = await generate(isCard ? cardPrompt(card, false) : cardText);
      }
    } else {
      b64 = await generate(cardText);
    }

    if (!b64) return NextResponse.json({ error: "ai_failed" }, { status: 502 });

    const img = sharp(Buffer.from(b64, "base64"));
    const jpeg = await (isCard ? img.resize(1200, 1800, { fit: "inside" }) : img.resize(1400, 1400, { fit: "inside" }))
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    const path = `drafts/${crypto.randomUUID()}.jpg`;
    const { error } = await getAdminClient().storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: "image/jpeg" });
    if (error) {
      console.error("artwork upload", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ path, fullCard: isCard });
  } catch (e) {
    console.error("artwork failed", e);
    return NextResponse.json({ error: "ai_failed", code: e instanceof Error ? e.message.slice(0, 40) : "unknown" }, { status: 502 });
  }
}
