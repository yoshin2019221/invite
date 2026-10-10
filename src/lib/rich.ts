import { z } from "zod";

// Extra sections a host can add to a rich invite. Stored in events.details.rich (jsonb).
const t = (max: number) => z.string().trim().max(max);
export const PHOTO_PATH = /^(drafts|events)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const photo = z.string().regex(PHOTO_PATH);

export const richSchema = z.object({
  itinerary: z
    .array(
      z.object({
        name: t(80).min(1),
        startsAt: z.iso.datetime({ offset: true }).optional(),
        venue: t(120).optional(),
        note: t(160).optional(),
      }),
    )
    .max(8)
    .default([]),
  story: z
    .array(
      z.object({
        title: t(80).min(1),
        when: t(40).optional(),
        text: t(400).optional(),
        photo: photo.optional(),
      }),
    )
    .max(8)
    .default([]),
  gallery: z.array(photo).max(8).default([]),
  countdown: z.boolean().default(true),
  music: z.boolean().default(true),
});
export type Rich = z.infer<typeof richSchema>;

export const EMPTY_RICH: Rich = {
  itinerary: [],
  story: [],
  gallery: [],
  countdown: true,
  music: true,
};

export function richOf(details: unknown): Rich {
  const raw = (details as { rich?: unknown } | null)?.rich;
  const parsed = richSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : EMPTY_RICH;
}

export function richPhotoPaths(details: unknown): string[] {
  const r = richOf(details);
  return [...r.gallery, ...r.story.flatMap((s) => (s.photo ? [s.photo] : []))];
}

// Initials for the monogram, e.g. "Aarav & Meera's wedding" -> ["A", "M"]; "आरव और मीरा" -> ["आ", "म"].
export function monogram(title: string): string[] {
  const parts = title.split(/\s*(?:&|\+|\band\b|\bweds\b|और)\s*/i).map((x) => x.trim()).filter(Boolean);
  const first = (x: string) => Array.from(x.replace(/^[^\p{L}]+/u, ""))[0] ?? "";
  const out = parts.slice(0, 2).map(first).filter(Boolean);
  return out.length ? out : [first(title)].filter(Boolean);
}
