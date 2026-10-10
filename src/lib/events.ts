import "server-only";
import { headers } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

export type PublicEvent = {
  slug: string;
  title: string;
  host_names: string;
  occasion: string;
  starts_at: string;
  timezone: string;
  venue_name: string | null;
  address: string | null;
  map_url: string | null;
  message: string | null;
  photo_path: string | null;
  theme: string;
  template: string;
  details: unknown;
  updated_at: string;
};

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return null;
  const { data } = await getAdminClient()
    .from("events")
    .select(
      "slug, title, host_names, occasion, starts_at, timezone, venue_name, address, map_url, message, photo_path, theme, template, details, updated_at, status",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  const { status: _status, ...event } = data;
  void _status;
  return event as PublicEvent;
}

export function intlLocale(locale: string) {
  return locale === "hi" ? "hi-IN" : "en-IN";
}

// Hindi clock time: "शाम 6:30 बजे" (Intl would show an English "pm").
function hindiTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone: timezone,
  }).formatToParts(date);
  const h = Number(parts.find((x) => x.type === "hour")?.value ?? 0);
  const m = parts.find((x) => x.type === "minute")?.value ?? "00";
  const period = h < 4 ? "रात" : h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 20 ? "शाम" : "रात";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${m} बजे`;
}

export function formatWhen(startsAt: string, timezone: string, locale: string) {
  const d = new Date(startsAt);
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone,
  }).format(d);
  return `${date}, ${formatTimeOnly(startsAt, timezone, locale)}`;
}

export function formatWhenShort(startsAt: string, timezone: string, locale: string) {
  const d = new Date(startsAt);
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short", day: "numeric", month: "short", timeZone: timezone,
  }).format(d);
  return `${date}, ${formatTimeOnly(startsAt, timezone, locale)}`;
}

export function formatDateOnly(startsAt: string, timezone: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

export function formatTimeOnly(startsAt: string, timezone: string, locale: string) {
  if (locale === "hi") return hindiTime(new Date(startsAt), timezone);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

export function eventVersion(event: Pick<PublicEvent, "updated_at">) {
  return String(new Date(event.updated_at).getTime());
}

// The public address of the site. On Vercel production it is the project's own domain, so a
// wrong or placeholder NEXT_PUBLIC_SITE_URL cannot break links; elsewhere it comes from the env.
export function siteOrigin() {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function absoluteUrl(path: string) {
  return new URL(path, siteOrigin()).toString();
}

// For pages rendered per request (host page, print card): the address the visitor used.
export async function requestUrl(path: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return absoluteUrl(path);
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return new URL(path, `${proto}://${host}`).toString();
}

// "2026-11-14" and "18:30" in the event's own timezone, for <input type="date|time">.
export function toLocalInputs(startsAt: string, timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(startsAt))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// A Google Maps link: the host's own, or a search for the address.
export function mapLink(event: Pick<PublicEvent, "map_url" | "venue_name" | "address">) {
  if (event.map_url) return event.map_url;
  const q = [event.venue_name, event.address].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
