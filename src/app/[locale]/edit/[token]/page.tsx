import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { formatWhenShort, requestUrl, toLocalInputs } from "@/lib/events";
import { richOf } from "@/lib/rich";
import { isTemplate } from "@/lib/templates";
import { themeOf } from "@/lib/themes";
import AppBar from "@/components/app/AppBar";
import DownloadCard from "@/components/invite/DownloadCard";
import AutoRefresh from "./AutoRefresh";
import DeleteInvite from "./DeleteInvite";
import EditForm from "./EditForm";
import Households from "./Households";
import ShareButtons from "./ShareButtons";

export const dynamic = "force-dynamic";

// The token is in the URL, so keep it out of referrers, search engines and caches.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EditPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const { data: event } = await getAdminClient()
    .from("events")
    .select("id, slug, title, host_names, starts_at, timezone, venue_name, address, map_url, message, theme, occasion, template, details")
    .eq("edit_token_hash", hashToken(token))
    .maybeSingle();
  if (!event) notFound();

  const db = getAdminClient();
  const [{ data: totalRows }, { data: replies }] = await Promise.all([
    db.rpc("event_totals", { p_event_id: event.id }),
    db
      .from("rsvps")
      .select("id, guest_name, status, headcount, note, household_id, updated_at")
      .eq("event_id", event.id)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);
  const { data: households } = await db
    .from("households")
    .select("id, name, link_token, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });
  const byHousehold = new Map(
    (replies ?? []).filter((r) => r.household_id).map((r) => [r.household_id as string, r]),
  );
  const householdRows = await Promise.all((households ?? []).map(async (h) => {
    const r = byHousehold.get(h.id);
    return {
      id: h.id,
      name: h.name,
      link: await requestUrl(`/${locale}/e/${event.slug}?h=${h.link_token}`),
      status: (r?.status ?? null) as "coming" | "maybe" | "not_coming" | null,
      headcount: r?.headcount ?? 0,
    };
  }));
  const totals = Array.isArray(totalRows) ? totalRows[0] : totalRows;
  const coming = Number(totals?.coming_people ?? 0);
  const maybe = Number(totals?.maybe_households ?? 0);
  const declined = Number(totals?.not_coming_households ?? 0);

  const t = await getTranslations("Edit");
  const guestT = await getTranslations("Guest");
  const guestUrl = await requestUrl(`/${locale}/e/${event.slug}`);
  const when = formatWhenShort(event.starts_at, event.timezone, locale);
  const local = toLocalInputs(event.starts_at, event.timezone);

  return (
    <>
    <AppBar />
    <main className="app-big mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-4xl text-maroon">{t("heading")}</h1>
      <p className="text-lg text-ink-soft">{t("intro")}</p>

      <section className="rounded-lg bg-white/70 p-5">
        <p className="font-display text-2xl">{event.title}</p>
        <p className="text-lg text-ink-soft">{event.host_names}</p>
      </section>

      <Link
        href={`/${locale}/e/${event.slug}`}
        className="self-start rounded-lg border-2 border-maroon px-6 py-3 text-lg font-semibold text-maroon active:scale-95"
      >
        {t("viewInvite")}
      </Link>
      <Link
        href={`/${locale}/e/${event.slug}/print`}
        className="self-start rounded-lg border-2 border-maroon/30 px-6 py-3 text-lg font-medium text-maroon active:scale-95"
      >
        {t("printCard")}
      </Link>

      <ShareButtons
        guestUrl={guestUrl}
        inviteText={guestT("forwardText", { title: event.title })}
        reminderText={t("reminderText", { title: event.title, when })}
      />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-3xl text-maroon">{t("guestsHeading")}</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-maroon p-4 text-paper">
            <p className="font-display text-5xl">{coming}</p>
            <p className="text-base">{t("totalComing")}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-4">
            <p className="font-display text-5xl text-maroon">{maybe}</p>
            <p className="text-base">{t("totalMaybe")}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-4">
            <p className="font-display text-5xl text-maroon">{declined}</p>
            <p className="text-base">{t("totalNo")}</p>
          </div>
        </div>
        <AutoRefresh />
        <a
          href={`/api/v1/edit/${token}/export`}
          className="self-start rounded-md border border-maroon/30 px-4 py-2 text-base text-maroon active:scale-95"
        >
          {t("exportCsv")}
        </a>
        {!replies || replies.length === 0 ? (
          <p className="text-lg text-ink-soft">{t("noReplies")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {replies.map((r) => (
              <li key={r.id} className="rounded-lg bg-white/70 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xl font-medium">{r.guest_name}</p>
                  <p className="whitespace-nowrap text-lg font-semibold text-maroon">
                    {r.status === "coming" && t("rowComing", { count: r.headcount })}
                    {r.status === "maybe" && t("rowMaybe")}
                    {r.status === "not_coming" && t("rowNo")}
                  </p>
                </div>
                {r.note && <p className="mt-1 text-base text-ink-soft">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Households
        token={token}
        title={event.title}
        when={when}
        rows={householdRows}
      />

      <DownloadCard slug={event.slug} locale={locale} />

      <EditForm
        token={token}
        initial={{
          title: event.title,
          hostNames: event.host_names,
          date: local.date,
          time: local.time,
          venueName: event.venue_name ?? "",
          address: event.address ?? "",
          mapUrl: event.map_url ?? "",
          message: event.message ?? "",
          theme: themeOf(event.theme),
          template: isTemplate(event.template) ? event.template : "classic",
          rich: richOf(event.details),
        }}
        occasion={event.occasion}
      />
      <DeleteInvite token={token} locale={locale} />
    </main>
    </>
  );
}
