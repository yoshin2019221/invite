import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/routing";
import { googleCalendarUrl } from "@/lib/calendar";
import {
  absoluteUrl,
  eventVersion,
  formatDateOnly,
  formatTimeOnly,
  formatWhenShort,
  getPublicEvent,
  mapLink,
} from "@/lib/events";
import { photoPublicUrl } from "@/lib/supabase/admin";
import { themeOf } from "@/lib/themes";
import RsvpForm from "./RsvpForm";

// Rendered once, then served from cache and refreshed at most once a minute.
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

const loadEvent = cache(getPublicEvent);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const event = await loadEvent(slug);
  if (!event) return {};

  const t = await getTranslations({ locale, namespace: "Guest" });
  const description = `${t("hostedBy", { names: event.host_names })} · ${formatWhenShort(
    event.starts_at,
    event.timezone,
    locale,
  )}`;
  const image = absoluteUrl(
    `/api/v1/og/${slug}?locale=${locale}&v=${eventVersion(event)}`,
  );

  return {
    title: event.title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "GharInvite",
      title: event.title,
      description,
      locale: locale === "hi" ? "hi_IN" : "en_IN",
      url: absoluteUrl(`/${locale}/e/${slug}`),
      images: [{ url: image, width: 1200, height: 630, type: "image/jpeg", alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [image],
    },
  };
}

export default async function GuestInvitePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const event = await loadEvent(slug);
  if (!event) notFound();

  const t = await getTranslations("Guest");
  const occasions = await getTranslations("Occasions");
  const lang = await getTranslations("Language");
  const other: Locale = locale === "en" ? "hi" : "en";

  const photo = photoPublicUrl(event.photo_path);
  const date = formatDateOnly(event.starts_at, event.timezone, locale);
  const time = formatTimeOnly(event.starts_at, event.timezone, locale);
  const inviteUrl = absoluteUrl(`/${locale}/e/${slug}`);
  const forward = `https://wa.me/?text=${encodeURIComponent(`${t("forwardText", { title: event.title })}\n${inviteUrl}`)}`;

  const buttonClass =
    "rounded-lg border-2 border-maroon px-6 py-4 text-lg font-semibold text-maroon transition-transform active:scale-95";

  return (
    <div data-theme={themeOf(event.theme)} className="min-h-dvh">
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-5 py-6">
      <header className="flex justify-end">
        <Link
          href={`/${other}/e/${slug}`}
          hrefLang={other}
          aria-label={lang("label")}
          className="rounded-md border border-maroon/30 px-4 py-2 text-base font-medium text-maroon"
        >
          {lang("switchTo")}
        </Link>
      </header>

      <article className="flex flex-col gap-7 rounded-3xl border-2 border-maroon/70 bg-white/45 p-5 pb-8 sm:p-8">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
        )}

        <header className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-medium uppercase tracking-widest text-saffron">
            {occasions(event.occasion)}
          </p>
          <h1 className="font-display text-5xl leading-tight text-maroon">{event.title}</h1>
          <p className="text-xl text-ink-soft">{t("hostedBy", { names: event.host_names })}</p>
          <span aria-hidden className="mt-1 block h-[3px] w-24 bg-saffron" />
          <a
            href="#rsvp"
            className="mt-2 rounded-lg bg-maroon px-8 py-3 text-xl font-semibold text-paper active:scale-95"
          >
            {t("replyNow")}
          </a>
        </header>

        <section className="flex flex-col items-center gap-1 text-center">
          <p className="text-base uppercase tracking-widest text-ink-soft">{t("when")}</p>
          <p className="font-display text-3xl leading-snug text-ink">{date}</p>
          <p className="text-2xl font-medium text-ink">{time}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href={`/api/v1/events/${slug}/calendar?locale=${locale}`}
              className={buttonClass}
            >
              {t("addToCalendar")}
            </a>
            <a
              href={googleCalendarUrl(event, inviteUrl)}
              target="_blank"
              rel="noreferrer"
              className={`${buttonClass} border-maroon/30 font-medium`}
            >
              {t("googleCalendar")}
            </a>
          </div>
        </section>

        {(event.venue_name || event.address) && (
          <section className="flex flex-col items-center gap-2 text-center">
            <p className="text-base uppercase tracking-widest text-ink-soft">{t("where")}</p>
            {event.venue_name && (
              <p className="font-display text-3xl leading-snug text-ink">{event.venue_name}</p>
            )}
            {event.address && <p className="text-lg text-ink-soft">{event.address}</p>}
            {mapLink(event) && (
              <a
                href={mapLink(event)!}
                target="_blank"
                rel="noreferrer"
                className={`${buttonClass} mt-2`}
              >
                {t("openMap")}
              </a>
            )}
          </section>
        )}

        {event.message && (
          <p className="whitespace-pre-line text-center text-xl leading-relaxed text-ink">
            {event.message}
          </p>
        )}
      </article>

      <RsvpForm slug={slug} />

      <a
        href={forward}
        target="_blank"
        rel="noreferrer"
        className="self-center rounded-lg border-2 border-maroon/30 px-6 py-3 text-lg font-medium text-maroon active:scale-95"
      >
        {t("forward")}
      </a>
    </main>
    </div>
  );
}
