import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/routing";
import {
  absoluteUrl,
  eventVersion,
  formatWhenShort,
  getPublicEvent,
} from "@/lib/events";
import RichInvite from "@/components/invite/RichInvite";

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
      siteName: "weInvite",
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

  const o: Locale = locale === "en" ? "hi" : "en";
  return (
    <RichInvite
      event={event}
      locale={locale}
      inviteUrl={absoluteUrl(`/${locale}/e/${slug}`)}
      otherLocalePath={`/${o}/e/${slug}`}
    />
  );
}
