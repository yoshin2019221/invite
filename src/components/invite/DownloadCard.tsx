"use client";

import { useTranslations } from "next-intl";

// Big buttons to save the invite as a picture (WhatsApp status, chat, or A5 print).
export default function DownloadCard({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations("Card");
  const items = [
    { f: "story", icon: "📱", name: t("story"), hint: t("storyHint") },
    { f: "square", icon: "🖼️", name: t("square"), hint: t("squareHint") },
    { f: "print", icon: "🖨️", name: t("print"), hint: t("printHint") },
  ];
  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-maroon/20 bg-white/50 p-5">
      <div>
        <h2 className="font-display text-3xl text-maroon">{t("heading")}</h2>
        <p className="mt-1 text-lg text-ink-soft">{t("intro")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((x) => (
          <a
            key={x.f}
            href={`/api/v1/card/${slug}?format=${x.f}&locale=${locale}&download=1`}
            download
            className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-maroon bg-paper px-4 py-4 text-center text-xl font-semibold text-maroon transition-transform active:scale-95"
          >
            <span aria-hidden className="text-3xl">{x.icon}</span>
            {x.name}
            <span className="text-base font-normal text-ink-soft">{x.hint}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
