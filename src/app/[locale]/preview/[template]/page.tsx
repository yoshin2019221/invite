import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import RichInvite from "@/components/invite/RichInvite";
import { isLocale } from "@/i18n/routing";
import { sampleEvent } from "@/lib/sample";
import { isTemplate, TEMPLATE_DEFS } from "@/lib/templates";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Params = { locale: string; template: string };
type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined, max: number) => {
  const s = (Array.isArray(v) ? v[0] : v)?.trim().slice(0, max);
  return s || undefined;
};

export default async function PreviewPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { locale, template } = await params;
  if (!isLocale(locale) || !isTemplate(template) || !TEMPLATE_DEFS[template].rich) notFound();
  setRequestLocale(locale);
  const q = await searchParams;
  const { event } = sampleEvent(template, locale);

  // Live preview: the host's own details replace the sample ones as they type.
  const live = q.live === "1";
  if (live) {
    const title = one(q.title, 120);
    const hosts = one(q.hosts, 120);
    const date = one(q.date, 10);
    const time = one(q.time, 5);
    const venue = one(q.venue, 120);
    const message = one(q.message, 600);
    if (title) event.title = title;
    if (hosts) event.host_names = hosts;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const t = time && /^\d{2}:\d{2}$/.test(time) ? time : "18:00";
      const d = new Date(`${date}T${t}:00+05:30`);
      if (!Number.isNaN(d.getTime())) event.starts_at = d.toISOString();
    }
    event.venue_name = venue ?? null;
    event.address = null;
    event.message = message ?? null;
    // Hide the sample story and function list so only the host's details show.
    event.details = { rich: { countdown: true, music: false, gallery: [], heroFullCard: false, story: [], itinerary: [] } };
  }

  return (
    <RichInvite
      event={event}
      locale={locale}
      inviteUrl={`/${locale}/preview/${template}`}
      otherLocalePath={`/${locale === "en" ? "hi" : "en"}/preview/${template}`}
      preview
    />
  );
}
