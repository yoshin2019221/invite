import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { isLocale, type Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = useTranslations("Home");
  const brand = useTranslations("Brand");
  const lang = useTranslations("Language");
  const other: Locale = locale === "en" ? "hi" : "en";

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-6">
      <header className="flex justify-end">
        <Link
          href={`/${other}`}
          hrefLang={other}
          aria-label={lang("label")}
          className="rounded-md border border-maroon/30 px-4 py-2 text-base font-medium text-maroon transition-transform active:scale-95"
        >
          {lang("switchTo")}
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-6 pb-16">
        <p className="rise font-display text-6xl leading-none text-maroon sm:text-8xl">
          {brand("name")}
        </p>
        <h1 className="rise rise-2 font-display text-3xl leading-tight text-ink sm:text-5xl">
          {t("headline")}
        </h1>
        <p className="rise rise-2 max-w-xl text-xl leading-relaxed text-ink-soft">
          {t("subline")}
        </p>
        <div className="rise rise-3 flex flex-col items-start gap-4">
          <Link
            href={`/${locale}/create`}
            className="rounded-lg bg-maroon px-8 py-4 text-xl font-semibold text-paper transition-transform hover:bg-maroon-deep active:scale-95"
          >
            {t("cta")}
          </Link>
          <p className="text-base text-ink-soft">{t("note")}</p>
        </div>
      </section>
      <footer className="pb-6">
        <Link href={`/${locale}/privacy`} className="text-base text-ink-soft underline">
          {t("privacy")}
        </Link>
      </footer>
    </main>
  );
}
