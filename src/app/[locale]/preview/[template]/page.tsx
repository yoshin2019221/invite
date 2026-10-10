import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import RichInvite from "@/components/invite/RichInvite";
import { isLocale } from "@/i18n/routing";
import { sampleEvent } from "@/lib/sample";
import { isTemplate, TEMPLATE_DEFS } from "@/lib/templates";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: { params: Promise<{ locale: string; template: string }> }) {
  const { locale, template } = await params;
  if (!isLocale(locale) || !isTemplate(template) || !TEMPLATE_DEFS[template].rich) notFound();
  setRequestLocale(locale);
  const { event } = sampleEvent(template, locale);
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
