import { getTranslations } from "next-intl/server";
import { eventVersion, formatWhen, getPublicEvent } from "@/lib/events";
import { renderInviteJpeg } from "@/lib/og/invite-image";
import { photoPublicUrl } from "@/lib/supabase/admin";

async function fetchPhoto(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

// The WhatsApp / social preview card for an invite, as a small JPEG.
// The invite page links to it with ?v=<version>, so edits get a fresh image.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "hi" ? "hi" : "en";

  const event = await getPublicEvent(slug);
  if (!event) return new Response("Not found", { status: 404 });

  const occasions = await getTranslations({ locale, namespace: "Occasions" });
  const guest = await getTranslations({ locale, namespace: "Guest" });

  const whereLine = [event.venue_name, event.address].filter(Boolean).join(", ") || null;
  const jpeg = await renderInviteJpeg({
    occasionLabel: occasions(event.occasion),
    title: event.title,
    hostLine: guest("hostedBy", { names: event.host_names }),
    whenLine: formatWhen(event.starts_at, event.timezone, locale),
    whereLine: whereLine && whereLine.length > 70 ? `${whereLine.slice(0, 68)}…` : whereLine,
    photo: await fetchPhoto(photoPublicUrl(event.photo_path)),
    brand: "weInvite",
    theme: event.theme,
    template: event.template,
  });

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Event-Version": eventVersion(event),
    },
  });
}
