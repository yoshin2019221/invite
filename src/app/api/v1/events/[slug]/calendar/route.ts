import { buildIcs } from "@/lib/calendar";
import { absoluteUrl, getPublicEvent } from "@/lib/events";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "hi" ? "hi" : "en";
  const event = await getPublicEvent(slug);
  if (!event) return new Response("Not found", { status: 404 });

  const ics = buildIcs(event, absoluteUrl(`/${locale}/e/${event.slug}`));
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="invite-${event.slug}.ics"`,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
