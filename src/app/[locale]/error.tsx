"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Error");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-display text-4xl text-maroon">{t("heading")}</h1>
      <p className="text-xl text-ink-soft">{t("body")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-maroon px-8 py-4 text-xl font-semibold text-paper active:scale-95"
      >
        {t("retry")}
      </button>
    </main>
  );
}
