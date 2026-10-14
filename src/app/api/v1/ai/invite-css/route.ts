import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

// Generates custom CSS for the HTML web invite page based on the AI design prompt.
// This makes the web invite look cohesive with the AI-generated card image.

const bodySchema = z.object({
  designPrompt: z.string().trim().min(10).max(4000),
  occasion: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
});

const SYSTEM = `You are an expert CSS designer for Indian invitation websites. Given a design prompt that was used to create an invitation card image, generate a MATCHING CSS stylesheet for the HTML web invite page.

The page uses these CSS custom properties that you MUST override to match the design:
--paper: page background colour
--paper-deep: deeper background shade (for cards, sections)
--ink: main text colour
--ink-soft: softer text colour (subtitles, captions)
--maroon: primary accent colour (headings, buttons)
--maroon-deep: deeper accent (button hover, borders)
--saffron: secondary highlight colour (decorative accents)

RULES:
1. Output ONLY valid CSS — no markdown fences, no explanations, no comments.
2. Start with :root { } overriding the 7 custom properties above with hex colours that match the design prompt.
3. Add a .design-ai class with background styling (gradient, texture, pattern) that evokes the design mood.
4. Style these existing classes to match the design's feel:
   - .hero-cardfull — the full-card hero section
   - .hero-cardfull-bg — blurred background behind the card
   - .flow — the main content area below the hero
   - .sec — content sections (message, countdown, itinerary, venue, RSVP)
   - .sec-title — section headings
   - .event-card — individual event/itinerary cards
   - .btn-main — primary action buttons
   - .btn-ghost — secondary outline buttons
   - .count-cell — countdown number cells
   - .story — timeline section
   - .story-dot — timeline dots
   - .message — the host's message text
5. Use the design prompt's colours, textures, and mood. If the prompt says "dark/midnight/noir", make it a dark theme. If it says "silk/velvet/marble", add subtle CSS textures.
6. Add decorative CSS pseudo-elements (::before, ::after) on .sec or .flow for ornamental touches like borders, gradients, or subtle patterns that match the design mood.
7. Keep it under 3500 characters. Only override what matters for this specific design — don't rewrite everything.
8. Every colour must be a hex value or rgba(). No colour names, no var() references inside :root.
9. For backgrounds, prefer layered CSS gradients that create depth and texture — not flat colours.
10. Make sure text is always legible against the background you choose.

COLOUR CONSISTENCY (critical):
11. The hero card and the content sections below MUST share one unified palette. Extract 2-3 dominant colours from the design prompt and weave them through EVERY section — hero background, .flow background, .sec borders, .event-card, .count-cell, .btn-main, .btn-ghost. The page must feel like one continuous design, not a card pasted above a separate website.
12. Use the SAME --paper colour (or a very close tint) as the .flow background and .hero-cardfull background. Use the SAME --maroon for section headings, buttons, and card accents. Use the SAME --saffron for decorative dots, countdown borders, and story timeline.

COLOUR PSYCHOLOGY for FONTS (critical):
13. NEVER use plain black (#000), plain grey (#666/#888), or generic dark (#333) for text. Instead, tint the text colours to harmonise with the accent palette:
   - For warm designs (gold, red, maroon, saffron): use warm-tinted darks like #2d1810, #3b2218, #4a2c1a for --ink
   - For cool designs (blue, teal, green): use cool-tinted darks like #1a2536, #1e3028, #2a1f3a for --ink
   - For --ink-soft, lighten the tinted dark by ~30% to stay in the same colour family
14. For --maroon / heading colours, use rich, emotionally resonant tones from colour psychology:
   - Celebrations/weddings: deep rose (#9b2335), rich crimson (#8b1a2b), or warm burgundy (#722f37) — evokes love, passion
   - Luxury/royal: deep gold (#8b6914), regal purple (#5b2d8e), or bronze (#8b6538) — evokes prestige, elegance
   - Religious/spiritual: saffron-orange (#c97b2a), temple vermilion (#c44536), deep maroon (#7a2e3a) — evokes devotion, warmth
   - Joyful/party: vibrant magenta (#a4296a), electric coral (#d4573b), or festive teal (#1a7a6d) — evokes energy, excitement
   - Baby/soft: dusty rose (#b4687a), gentle mauve (#8e6b8a), or sky blue (#4a7fa5) — evokes tenderness, nurture
15. For --saffron, pick a luminous highlight that creates visual warmth: gold (#d4a853), warm amber (#e09b3d), rose-gold (#c98b6e), or glowing copper (#c87941). This colour should feel like sunlight touching the page.`;

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`icss:min:${ip}`, 5, 60_000) || !rateLimit(`icss:hour:${ip}`, 20, 3_600_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { designPrompt, occasion, title } = parsed.data;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

  const userMsg = `Occasion: ${occasion || "celebration"}${title ? `\nEvent: ${title}` : ""}

Design prompt used for the invitation card:
${designPrompt}

Generate CSS that makes the web invite page match this card's visual style.`;

  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_completion_tokens: 2000,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.error("invite-css api", res.status);
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let css = body.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip markdown fences if the model added them
    css = css.replace(/^```(?:css)?\n?/i, "").replace(/\n?```$/i, "").trim();

    if (!css || css.length < 20) {
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }

    // Basic sanitisation: remove any <script, @import, url() pointing to external resources
    css = css.replace(/<script[\s\S]*?<\/script>/gi, "");
    css = css.replace(/@import\s[^;]+;/gi, "");
    css = css.replace(/url\s*\(\s*["']?https?:\/\/[^)]+\)/gi, "url()");

    // Cap size
    if (css.length > 5000) css = css.slice(0, 5000);

    return NextResponse.json({ css });
  } catch (e) {
    console.error("invite-css failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
