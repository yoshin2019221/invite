"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
  template: string;
  title: string;
  hosts: string;
  date: string;
  time: string;
  venue: string;
  message: string;
};

// Shows the chosen template with the host's own details, refreshed shortly after they stop typing.
export default function LivePreview(p: Props) {
  const t = useTranslations("Create");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
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

  if (!src) return null;
  return (
    <section className="flex flex-col items-center gap-3">
      <p className="self-start text-lg font-medium">{t("livePreview")}</p>
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border-2 border-maroon/20 shadow-lg">
        <iframe src={src} title={t("livePreview")} className="h-[560px] w-full" />
      </div>
      <p className="self-start text-sm text-ink-soft">{t("livePreviewNote")}</p>
    </section>
  );
}
