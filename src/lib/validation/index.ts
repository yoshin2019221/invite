import { z } from "zod";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";

export const OCCASIONS = [
  "birthday",
  "housewarming",
  "pooja",
  "baby",
  "party",
] as const;
export const LANGUAGES = ["en", "hi"] as const;
export const RSVP_STATUSES = ["coming", "not_coming", "maybe"] as const;

export const occasionSchema = z.enum(OCCASIONS);

const trimmed = (max: number) => z.string().trim().max(max);

export const createEventSchema = z.object({
  occasion: occasionSchema,
  title: trimmed(120).min(1),
  hostNames: trimmed(120).min(1),
  startsAt: z.iso.datetime({ offset: true }),
  timezone: z.string().default("Asia/Kolkata"),
  venueName: trimmed(120).optional(),
  address: trimmed(300).optional(),
  mapUrl: z.url().optional(),
  message: trimmed(600).optional(),
  details: z.record(z.string(), z.unknown()).default({}),
  theme: z.enum(THEMES).default(DEFAULT_THEME),
  language: z.enum(LANGUAGES).default("en"),
  photoPath: z
    .string()
    .regex(/^drafts\/[0-9a-f-]{36}\.(jpg|png|webp)$/)
    .optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

const rsvpFields = z.object({
  guestName: trimmed(80).min(1),
  status: z.enum(RSVP_STATUSES),
  headcount: z.number().int().min(0).max(12),
  note: trimmed(300).optional(),
});
const headcountRule = (v: { status: string; headcount: number }) =>
  v.status === "not_coming" || v.headcount >= 1;
const headcountIssue = {
  message: "headcount must be at least 1 unless not coming",
  path: ["headcount"],
};

export const submitRsvpSchema = rsvpFields.refine(headcountRule, headcountIssue);
export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;

// What the browser sends: the reply plus a random per-device token (so the same device
// can change its reply later) and an optional Turnstile token.
export const rsvpRequestSchema = rsvpFields
  .extend({
    deviceToken: z.string().regex(/^[A-Za-z0-9_-]{22,64}$/),
    turnstileToken: z.string().max(2048).optional(),
  })
  .refine(headcountRule, headcountIssue);

// Host edits an existing invite (occasion and photo stay as created).
export const updateEventSchema = z.object({
  title: trimmed(120).min(1),
  hostNames: trimmed(120).min(1),
  startsAt: z.iso.datetime({ offset: true }),
  venueName: trimmed(120).optional(),
  address: trimmed(300).optional(),
  mapUrl: z.url().optional(),
  message: trimmed(600).optional(),
  theme: z.enum(THEMES),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
