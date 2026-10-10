import "server-only";
import { z } from "zod";
import { OCCASIONS } from "@/lib/validation";
import { TEMPLATES } from "@/lib/templates";

// Turns a host's free-text description (and optionally a sample invite image) into invite fields.
// The model only fills what the host actually said; anything missing becomes a simple question.

const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";

const nullableStr = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

export const extractedSchema = z.object({
  occasion: z.enum(OCCASIONS).nullish().transform((v) => v ?? null),
  title: nullableStr(120),
  hostNames: nullableStr(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().transform((v) => v ?? null),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullish().transform((v) => v ?? null),
  venueName: nullableStr(120),
  address: nullableStr(300),
  message: nullableStr(600),
  templateId: z.enum(TEMPLATES).nullish().transform((v) => v ?? null),
  styleStated: z.boolean().nullish().transform((v) => !!v),
  itinerary: z
    .array(z.object({ name: z.string().trim().min(1).max(80), date: nullableStr(10), time: nullableStr(5), venue: nullableStr(120), note: nullableStr(160) }))
    .max(8).nullish().transform((v) => v ?? []),
  story: z
    .array(z.object({ title: z.string().trim().min(1).max(80), when: nullableStr(40), text: nullableStr(400) }))
    .max(8).nullish().transform((v) => v ?? []),
});
export type Extracted = z.infer<typeof extractedSchema>;

export type Question = "occasion" | "title" | "hostNames" | "date" | "time" | "style";

// Only the essentials are asked, and only when the host did not already say them.
export function missingQuestions(d: Extracted): Question[] {
  const q: Question[] = [];
  if (!d.occasion) q.push("occasion");
  if (!d.title) q.push("title");
  if (!d.hostNames) q.push("hostNames");
  if (!d.date) q.push("date");
  if (!d.time) q.push("time");
  if (!d.styleStated || !d.templateId) q.push("style");
  return q;
}

const TOOL = {
  name: "fill_invite",
  description: "Record the invite details the host stated. Use null for anything not stated.",
  input_schema: {
    type: "object",
    properties: {
      occasion: { type: ["string", "null"], enum: [...OCCASIONS, null] },
      title: { type: ["string", "null"], description: "Invite title, e.g. \"Aarav's 5th birthday\". Only if stated or clearly implied." },
      hostNames: { type: ["string", "null"], description: "Who is hosting, e.g. \"The Sharma family\"." },
      date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      time: { type: ["string", "null"], description: "24-hour HH:MM" },
      venueName: { type: ["string", "null"] },
      address: { type: ["string", "null"] },
      message: { type: ["string", "null"], description: "A warm 1-2 sentence note to guests, written for this event, in the host's language." },
      templateId: { type: ["string", "null"], enum: [...TEMPLATES, null], description: "Closest design to the look the host wants (colours, mood, or the sample image). Null if no style hint." },
      styleStated: { type: "boolean", description: "true only if the host described a look, colours, mood, or gave a sample image." },
      itinerary: { type: "array", items: { type: "object", properties: { name: { type: "string" }, date: { type: ["string", "null"] }, time: { type: ["string", "null"] }, venue: { type: ["string", "null"] }, note: { type: ["string", "null"] } }, required: ["name"] } },
      story: { type: "array", items: { type: "object", properties: { title: { type: "string" }, when: { type: ["string", "null"] }, text: { type: ["string", "null"] } }, required: ["title"] } },
    },
    required: ["styleStated"],
  },
} as const;

const GUIDE = `You help an Indian family host build a digital invite. Read their description (it may be English, Hindi or Hinglish) and call fill_invite.
Rules:
- Never invent facts. If the title, host, date, time or venue is not stated, use null. Do not guess a date from nothing.
- Resolve relative dates ("next Saturday", "15 Nov") using today's date given below.
- "evening" alone is not a time; leave time null unless a clock time is given or clearly implied (e.g. "7 baje").
- Designs: royal = dark wedding with gold; jharokha = plum and gold arched-window wedding with monogram; rangeela = bold pink, teal and mustard patterned, playful wedding or party; ivory = ivory with green and rose floral borders, elegant wedding, baby or housewarming; bloom = soft pink wedding or baby; griha = housewarming with marigold; pooja = devotional, saffron on dark red; confetti = bright birthday or kids party; blossom = soft blue baby; night = dark neon party. Pick the closest to the colours or mood described, or to the sample image. Set styleStated=true only if they gave a look or image.
- itinerary only when they list several functions; story only when they give story moments.
- message: write one warm, natural line or two for guests, in the same language as the description.`;

type Image = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

export class AiUnavailable extends Error {}

export async function extractInvite(text: string, image?: Image): Promise<Extracted> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiUnavailable("no key");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const content: unknown[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  content.push({ type: "text", text: `Today (India): ${today}\n\nHost's description:\n${text || "(none, see the sample image)"}${image ? "\n\nThe attached image is a sample invite whose look they like. Use it for style, and read any details printed on it." : ""}` });

  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: GUIDE, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name }, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`model ${res.status}`);
  const body = (await res.json()) as { content?: { type: string; input?: unknown }[] };
  const block = body.content?.find((b) => b.type === "tool_use");
  const parsed = extractedSchema.safeParse(block?.input ?? {});
  if (!parsed.success) throw new Error("bad model output");
  return parsed.data;
}
