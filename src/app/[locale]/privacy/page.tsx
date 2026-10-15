import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
  const items = ["collect", "use", "share", "delete"] as const;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-4xl text-maroon">{t("heading")}</h1>
      {items.map((k) => (
        <section key={k} className="flex flex-col gap-2">
          <h2 className="font-display text-2xl text-maroon">{t(`${k}.title`)}</h2>
          <p className="text-lg leading-relaxed">{t(`${k}.body`)}</p>
        </section>
      ))}
      <Link href={`/${locale}`} className="self-start text-lg text-maroon underline">
        {t("home")}
      </Link>
    </main>
  );
}
