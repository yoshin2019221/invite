import "server-only";
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
  updated_at: string;
};

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return null;
  const { data } = await getAdminClient()
    .from("events")
    .select(
      "slug, title, host_names, occasion, starts_at, timezone, venue_name, address, map_url, message, photo_path, theme, updated_at, status",
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

export function formatWhen(startsAt: string, timezone: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

export function formatWhenShort(startsAt: string, timezone: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
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
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

export function eventVersion(event: Pick<PublicEvent, "updated_at">) {
  return String(new Date(event.updated_at).getTime());
}

export function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
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
