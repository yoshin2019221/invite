"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { designVars } from "@/lib/design-html";
import DesignFrame from "./DesignFrame";

type Props = {
  locale: string;
  template: string;
  designHtml?: string | null;
  occasion?: string;
  title: string;
  hosts: string;
  date: string;
  time: string;
  venue: string;
  message: string;
};

// Shows the invite with the host's own details, refreshed shortly after they stop typing.
// With an AI design it shows that design; otherwise the saved base look.
export default function LivePreview(p: Props) {
  const t = useTranslations("Create");
  const [src, setSrc] = useState<string | null>(null);
  const [typed, setTyped] = useState({ title: p.title, hosts: p.hosts, date: p.date, time: p.time, venue: p.venue, message: p.message });

  useEffect(() => {
    const id = setTimeout(() => {
      setTyped({ title: p.title, hosts: p.hosts, date: p.date, time: p.time, venue: p.venue, message: p.message });
      const q = new URLSearchParams({ live: "1" });
      if (p.title.trim()) q.set("title", p.title.trim());
      if (p.hosts.trim()) q.set("hosts", p.hosts.trim());
      if (p.date) q.set("date", p.date);
      if (p.time) q.set("time", p.time);
      if (p.venue.trim()) q.set("venue", p.venue.trim());
      if (p.message.trim()) q.set("message", p.message.trim());
      setSrc(`/${p.locale}/preview/${p.template}?${q.toString()}`);
    }, 700);
    return () => clearTimeout(id);
  }, [p.locale, p.template, p.title, p.hosts, p.date, p.time, p.venue, p.message]);

  const vars = useMemo(
    () =>
      designVars({
        locale: p.locale,
        title: typed.title.trim() || "—",
        hosts: typed.hosts.trim(),
        occasion: p.occasion ?? "",
        startsAtIso: typed.date ? `${typed.date}T${typed.time || "18:00"}:00+05:30` : "",
        venue: typed.venue.trim(),
        message: typed.message.trim(),
      }),
    [p.locale, p.occasion, typed],
  );

  if (!src && !p.designHtml) return null;
  return (
    <section className="flex flex-col items-center gap-3">
      <p className="self-start text-lg font-medium">{t("livePreview")}</p>
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border-2 border-maroon/20 shadow-lg">
        {p.designHtml ? (
          <DesignFrame html={p.designHtml} vars={vars} lang={p.locale} title={t("livePreview")} fixedHeight={560} />
        ) : (
          <iframe src={src ?? undefined} title={t("livePreview")} className="h-[560px] w-full" />
        )}
      </div>
      <p className="self-start text-sm text-ink-soft">{t("livePreviewNote")}</p>
    </section>
  );
}
