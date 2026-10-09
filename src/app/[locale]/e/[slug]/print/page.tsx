import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { formatDateOnly, formatTimeOnly, getPublicEvent, requestUrl } from "@/lib/events";
import { themeOf } from "@/lib/themes";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// A printable card with a QR code, for relatives who are not on WhatsApp.
export default async function PrintPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const t = await getTranslations("Print");
  const guest = await getTranslations("Guest");
  const url = await requestUrl(`/${locale}/e/${slug}`);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 240 });

  return (
    <div data-theme={themeOf(event.theme)} className="min-h-dvh px-5 py-8 print:p-0">
      <main className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-3xl border-2 border-maroon/70 bg-white/60 p-8 text-center print:border-4 print:bg-transparent">
        <h1 className="font-display text-5xl leading-tight text-maroon">{event.title}</h1>
        <p className="text-xl text-ink-soft">{guest("hostedBy", { names: event.host_names })}</p>
        <p className="font-display text-3xl text-ink">
          {formatDateOnly(event.starts_at, event.timezone, locale)}
        </p>
        <p className="text-2xl font-medium text-ink">
          {formatTimeOnly(event.starts_at, event.timezone, locale)}
        </p>
        {(event.venue_name || event.address) && (
          <p className="text-xl text-ink">{[event.venue_name, event.address].filter(Boolean).join(", ")}</p>
        )}
        <div
          className="mt-2 rounded-xl bg-white p-3"
          aria-label={t("qrLabel")}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-lg font-medium text-maroon">{t("scan")}</p>
        <p className="break-all text-base text-ink-soft">{url}</p>
      </main>
      <div className="mt-6 flex justify-center print:hidden">
        <PrintButton label={t("print")} />
      </div>
    </div>
  );
}
