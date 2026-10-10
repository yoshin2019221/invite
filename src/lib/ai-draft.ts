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
  artPrompt: nullableStr(280),
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
      artPrompt: { type: ["string", "null"], description: "In English, 1-2 sentences describing background artwork for this invite: motifs, colours, mood, setting (e.g. \"Marigold garlands and brass diyas, warm saffron and maroon tones, soft evening glow\"). Base it on the occasion and any look the host described. No people, no text." },
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
- artPrompt: always write it, in English, even if the host wrote Hindi.
- message: write one warm, natural line or two for guests, in the same language as the description.`;

type Image = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

export class AiUnavailable extends Error {}

export async function extractInvite(text: string, image?: Image): Promise<Extracted> {
  // Anthropic first; if only an OpenAI key is set, use that instead. One of the two is enough.
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!anthropicKey && !openaiKey) throw new AiUnavailable("no key");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const prompt = `Today (India): ${today}\n\nHost's description:\n${text || "(none, see the sample image)"}${image ? "\n\nThe attached image is a sample invite whose look they like. Use it for style, and read any details printed on it." : ""}`;
  const input = anthropicKey ? await viaAnthropic(anthropicKey, prompt, image) : await viaOpenAI(openaiKey as string, prompt, image);
  const parsed = extractedSchema.safeParse(input ?? {});
  if (!parsed.success) throw new Error("bad model output");
  return parsed.data;
}

async function viaAnthropic(key: string, prompt: string, image?: Image): Promise<unknown> {
  const content: unknown[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  content.push({ type: "text", text: prompt });
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: GUIDE, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name }, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    console.error("anthropic error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new Error(`anthropic_${res.status}`);
  }
  const body = (await res.json()) as { content?: { type: string; input?: unknown }[] };
  return body.content?.find((b) => b.type === "tool_use")?.input;
}

const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5-mini";

async function viaOpenAI(key: string, prompt: string, image?: Image): Promise<unknown> {
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (image) content.push({ type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}` } });
  const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com"}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      max_completion_tokens: 3000,
      ...(OPENAI_TEXT_MODEL.startsWith("gpt-5") ? { reasoning_effort: "minimal" } : {}),
      messages: [{ role: "system", content: GUIDE }, { role: "user", content }],
      tools: [{ type: "function", function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.input_schema } }],
      tool_choice: { type: "function", function: { name: TOOL.name } },
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) {
    console.error("openai text error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new Error(`openai_${res.status}`);
  }
  const body = (await res.json()) as { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[] };
  const args = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("openai_no_tool_call");
  return JSON.parse(args);
}
