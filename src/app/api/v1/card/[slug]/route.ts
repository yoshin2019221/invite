import { getTranslations } from "next-intl/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { eventVersion, formatTimeOnly, getPublicEvent, intlLocale } from "@/lib/events";
import { renderPosterJpeg, type PosterFormat } from "@/lib/og/poster-image";
import { photoPublicUrl } from "@/lib/supabase/admin";

const FORMATS: PosterFormat[] = ["story", "square", "print"];

// A downloadable picture of the invite: ?format=story|square|print&locale=en|hi&download=1
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`card:${clientIp(request)}`, 20, 60_000)) return new Response("Too many requests", { status: 429 });
  const { slug } = await params;
  const q = new URL(request.url).searchParams;
  const locale = q.get("locale") === "hi" ? "hi" : "en";
  const format = FORMATS.find((f) => f === q.get("format")) ?? "story";

  const event = await getPublicEvent(slug);
  if (!event) return new Response("Not found", { status: 404 });

  const occasions = await getTranslations({ locale, namespace: "Occasions" });
  const guest = await getTranslations({ locale, namespace: "Guest" });
  const d = new Date(event.starts_at);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale), { ...o, timeZone: event.timezone }).format(d);
  const where = [event.venue_name, event.address].filter(Boolean).join(", ") || null;

  let photo: Buffer | null = null;
  const url = photoPublicUrl(event.photo_path);
  if (url) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok) photo = Buffer.from(await r.arrayBuffer());
    } catch { /* render without the photo */ }
  }

  const jpeg = await renderPosterJpeg({
    format,
    occasionLabel: occasions(event.occasion),
    title: event.title,
    hostLine: guest("hostedBy", { names: event.host_names }),
    day: f({ day: "numeric" }),
    monthYear: f({ month: "long", year: "numeric" }),
    weekdayTime: `${f({ weekday: "long" })}, ${formatTimeOnly(event.starts_at, event.timezone, locale)}`,
    whereLine: where && where.length > 80 ? `${where.slice(0, 78)}…` : where,
    photo,
    brand: "weInvite",
    theme: event.theme,
    template: event.template,
  });

  const headers: Record<string, string> = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    "X-Event-Version": eventVersion(event),
  };
  if (q.get("download")) headers["Content-Disposition"] = `attachment; filename="invite-${slug}-${format}.jpg"`;
  return new Response(new Uint8Array(jpeg), { headers });
}
