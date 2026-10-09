import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const locale = await getLocale();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-display text-4xl text-maroon">{t("heading")}</h1>
      <p className="text-xl text-ink-soft">{t("body")}</p>
      <Link
        href={`/${locale}`}
        className="rounded-lg bg-maroon px-8 py-4 text-xl font-semibold text-paper active:scale-95"
      >
        {t("home")}
      </Link>
    </main>
  );
}
