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
  designPrompt: z.string().trim().max(4000).optional(),
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
  // "replace": reuse the reference picture AS the design — keep its artwork, erase its old text, write ours.
  mode: z.enum(["style", "replace"]).optional(),
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

  // The host's full design brief (if given) is the primary scene description; otherwise build a rich default.
  let look: string;
  if (c.designPrompt) {
    look = (
      `Design brief from the host (follow it closely and enhance with professional quality):\n${c.designPrompt}\n` +
      `Enhance this vision: ensure the composition has a clear visual hierarchy with the main headline prominent, ` +
      `decorative elements framing the text beautifully, and a harmonious colour palette throughout. ` +
      `Add subtle details like gold foil accents, soft gradients, and delicate texture overlays where appropriate.`
    );
  } else if (hasSample) {
    look = "Match the visual style, colour palette, decorative motifs, borders and overall mood of the attached reference image, as if the same designer made this card.";
  } else {
    // Rich default prompt based on occasion
    const occasionStyles: Record<string, string> = {
      wedding: "Rich, regal Indian wedding style: deep jewel tones (maroon, emerald, gold), ornate mandap illustration, paisley and lotus motifs, mehndi-inspired borders, scattered rose petals, gold foil accents, silk texture background.",
      birthday: "Vibrant, joyful celebration style: bright confetti bursts, playful balloon illustrations, streamers and party poppers, warm gradient background, fun hand-lettered typography feel, scattered stars and sparkles.",
      housewarming: "Warm, auspicious Indian housewarming style: marigold toran garlands framing the card, brass kalash and coconut illustration, rangoli patterns at corners, warm saffron and turmeric tones, terracotta accents, welcoming open door motif.",
      pooja: "Devotional, serene Indian pooja style: glowing brass diyas with warm flame halos, sacred lotus flowers, saffron and deep crimson palette, mandala borders, incense smoke wisps, gold bell illustrations, sandalwood texture background.",
      baby: "Soft, tender baby celebration style: pastel watercolour washes (blush pink, powder blue, mint), delicate floral garlands, tiny footprint motifs, soft clouds, twinkling stars, cradle illustration with flowing fabric, gentle gold accents.",
      party: "Energetic, modern celebration style: bold neon accents on dark background, geometric patterns, confetti explosions, metallic foil textures, dynamic diagonal layouts, string lights, disco sparkle effects.",
    };
    look = `Visual style: ${occasionStyles[c.occasion ?? ""] ?? "Elegant, warm, festive Indian celebration style with rich colours, ornate floral borders, gold foil accents, traditional motifs, and a luxurious hand-painted illustration feel."}`;
    if (c.style) look += ` Additional style notes: ${c.style}.`;
  }

  return (
    `Design ONE complete, finished, print-ready ${occ}invitation card — ` +
    `a single stunning portrait card that looks hand-designed by a premium Indian invitation studio. ` +
    `The decoration, illustrations and text must be composed together as one cohesive artwork — ` +
    `NOT a photograph with text pasted on top, NOT a plain background with text overlay.\n\n` +
    `${look}\n\n` +
    `COMPOSITION RULES:\n` +
    `- Create a clear visual hierarchy: main headline large and prominent at top or centre, supporting details smaller below.\n` +
    `- Frame the text area with decorative borders, ornamental corners, or illustrated vignettes.\n` +
    `- Use at most 2-3 complementary typeface styles: one decorative for the headline, one clean for details.\n` +
    `- Leave breathing room around text — don't crowd the card edge-to-edge with decoration.\n` +
    `- Background should have depth: subtle gradients, texture, or layered elements rather than flat colour.\n\n` +
    `This must be an ORIGINAL design: do not copy any specific existing image, brand, logo or artwork${hasSample ? ", and do not copy any names, dates or wording from the attached reference" : ""}. ` +
    `Illustrated or painted figures and motifs are welcome, but no photographs of real identifiable people.\n\n` +
    `Render ALL of the following text neatly and clearly, woven into the design, spelled EXACTLY as written, in ${lang}:\n` +
    lines.join("\n") +
    `\n\nTypography must be: beautifully styled, clearly legible, with good contrast against the background. ` +
    `No watermarks, no extra or placeholder text, no "lorem ipsum" — only the details listed above.`
  );
}

// Reuse an existing invitation picture: keep the artwork exactly, swap only the wording.
function replacePrompt(c: z.infer<typeof cardSchema>): string {
  const lang = c.language === "hi" ? "Hindi (Devanagari script)" : "English";
  const lines: string[] = [];
  if (c.title) lines.push(`Headline / names: ${c.title}`);
  if (c.hostNames) lines.push(`Hosted by: ${c.hostNames}`);
  if (c.dateText) lines.push(`Date: ${c.dateText}`);
  if (c.timeText) lines.push(`Time: ${c.timeText}`);
  if (c.venue) lines.push(`Venue: ${c.venue}`);
  if (c.message) lines.push(`Short line: ${c.message}`);
  return (
    `The attached image is an existing invitation card. Produce the SAME invitation design: keep the identical background, artwork, illustrations, ` +
    `colours, borders, ornaments, layout and lettering style, so it looks like the same designer's card.\n` +
    `Completely ERASE all of the old text on it (every name, date, time, venue, phone number, hashtag and line of wording) — no trace of the old words may remain. ` +
    `Repaint the background behind the erased text so it looks clean and natural.\n` +
    `Then write ONLY the following new details, in the same places and in the same style of lettering the original used for such text, spelled EXACTLY as written, in ${lang}:\n` +
    lines.join("\n") +
    `\nEvery word must be sharp, clearly legible and well placed. No watermarks, no extra or placeholder text.` +
    (c.designPrompt ? `\nExtra instruction from the host: ${c.designPrompt}` : "")
  );
}

// Enhance a design prompt using a text model before sending to image generation.
// This takes the host's designPrompt (which may be brief or detailed) and enriches
// it with professional design language, specific visual details, and image-gen-friendly terms.
async function enhanceDesignPrompt(
  designPrompt: string,
  occasion: string | undefined,
  key: string,
  base: string,
): Promise<string> {
  const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
  const system = `You are an expert Indian invitation designer who writes image-generation prompts.
Given a design brief for an invitation card, ENHANCE it into a vivid, detailed image prompt.

Rules:
- KEEP everything the original says — every colour, motif, style, illustration mentioned.
- ADD professional design details: specific textures (silk, marble, handmade paper, gold foil), lighting (warm glow, soft candlelight, golden hour), depth (layered elements, subtle shadows, dimensional borders), and rendering style (watercolour washes, digital painting, vector art, mixed media).
- ADD culturally appropriate Indian motifs for the occasion if not already mentioned.
- Make colours more specific: not just "blue" but "royal sapphire blue with peacock teal accents".
- Describe the composition: where the main elements sit, how borders frame the text area, the visual flow.
- Keep it under 500 words. Write as one flowing paragraph, no bullet points.
- Do NOT add any actual text/names/dates to render — only visual design direction.
- NEVER instruct to copy any specific existing artwork, brand or photo.`;

  const userMsg = `Occasion: ${occasion || "celebration"}
Design brief to enhance:
${designPrompt}`;

  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: textModel,
        max_completion_tokens: 800,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("enhance prompt failed", res.status);
      return designPrompt; // fall back to original
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const enhanced = body.choices?.[0]?.message?.content?.trim();
    return enhanced && enhanced.length > 50 ? enhanced : designPrompt;
  } catch (e) {
    console.error("enhance prompt error", e instanceof Error ? e.message : e);
    return designPrompt; // fall back to original on any error
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`art:min:${ip}`, 3, 60_000) || !rateLimit(`art:hour:${ip}`, 8, 3_600_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { prompt, occasion, card, reference, mode } = parsed.data;
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

    if (isCard && mode === "replace" && reference) {
      // The host asked to reuse this exact picture: edit it, erasing the old text and writing the new details.
      b64 = await editFromReference(replacePrompt(card), reference);
    } else if (isCard) {
      // Enhance the design prompt with professional design language before generating.
      // This adds vivid details, textures, and composition guidance the image model responds to well.
      const enhancedCard = card.designPrompt
        ? { ...card, designPrompt: await enhanceDesignPrompt(card.designPrompt, card.occasion, key, base) }
        : card;
      // Always GENERATE a fresh card from the design brief. The sample's look reaches us as the
      // style text the describe step wrote from it — we never edit/stamp the sample image itself,
      // because that makes the model keep the sample's own names, dates and layout.
      b64 = await generate(cardPrompt(enhancedCard, false));
    } else if (reference) {
      // Background mode with a reference image: an edit is fine (no text to protect).
      const bg = BG_GUARD + (prompt ?? "");
      try {
        b64 = await editFromReference(bg, reference);
      } catch (e) {
        console.error("edit failed, falling back to generate", e instanceof Error ? e.message : e);
        b64 = await generate(bg);
      }
    } else {
      b64 = await generate(BG_GUARD + prompt + (occasion ? ` (for a ${occasion} invitation, Indian family celebration)` : ""));
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
