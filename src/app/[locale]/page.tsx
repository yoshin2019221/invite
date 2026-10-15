import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { isLocale, type Locale } from "@/i18n/routing";
import Hero from "@/components/home/Hero";
import RsvpDemo from "@/components/home/RsvpDemo";
import TextSize from "@/components/home/TextSize";
import "./home.css";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = useTranslations("Home");
  const brand = useTranslations("Brand");
  const demo = useTranslations("Home.demo");
  const lang = useTranslations("Language");
  const other: Locale = locale === "en" ? "hi" : "en";

  return (
    <div className="home">
      <section className="h-hero">
        <div className="h-torana" aria-hidden />
        <header className="h-top">
          <span className="h-brand">{brand("name")}</span>
          <div className="h-top-r">
            <TextSize />
            <Link href={`/${other}`} hrefLang={other} aria-label={lang("label")} className="h-lang">
              {lang("switchTo")}
            </Link>
          </div>
        </header>

        <Hero />
      </section>

      <section className="h-sec h-steps">
        <h2 className="h-h2">{t("stepsHeading")}</h2>
        <ol className="h-steplist">
          {(["s1", "s2", "s3"] as const).map((k, i) => (
            <li key={k} className="h-step">
              <span className="h-step-n" aria-hidden>{i + 1}</span>
              <h3>{t(`${k}t`)}</h3>
              <p>{t(`${k}d`)}</p>
            </li>
          ))}
        </ol>

      </section>

      <section className="h-sec">
        <h2 className="h-h2">{demo("title")}</h2>
        <p className="h-p">{demo("sub")}</p>
        <RsvpDemo />
      </section>

      <footer className="h-foot">
        <span>{brand("name")}</span>
        <Link href={`/${locale}/privacy`}>{t("privacy")}</Link>
      </footer>
    </div>
  );
}
