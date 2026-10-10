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

// A phone-sized live preview of a real template, scaled down. Opens the full preview when tapped.
function Phone({ locale, id, label, className = "" }: { locale: string; id: string; label: string; className?: string }) {
  return (
    <div className={`phone ${className}`}>
      <iframe src={`/${locale}/preview/${id}`} title={label} loading="lazy" tabIndex={-1} aria-hidden />
    </div>
  );
}

const LOOKS = ["royal", "jharokha", "rangeela", "ivory", "bloom", "griha", "pooja", "confetti", "blossom", "night"] as const;
const OCC: Record<(typeof LOOKS)[number], string> = {
  royal: "wedding", jharokha: "wedding", rangeela: "wedding", ivory: "wedding", bloom: "wedding", griha: "housewarming", pooja: "pooja", confetti: "birthday", blossom: "baby", night: "party",
};

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = useTranslations("Home");
  const brand = useTranslations("Brand");
  const demo = useTranslations("Home.demo");
  const lang = useTranslations("Language");
  const occ = useTranslations("Occasions");
  const tpl = useTranslations("Templates");
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

      <section id="designs" className="h-sec">
        <h2 className="h-h2">{t("looksHeading")}</h2>
        <p className="h-p">{t("looksSub")}</p>
        <ul className="h-strip">
          {LOOKS.map((id) => (
            <li key={id} className="h-look">
              <Link href={`/${locale}/preview/${id}`} className="h-look-link">
                <Phone locale={locale} id={id} label={tpl(id)} />
                <p className="h-look-name">{tpl(id)}</p>
                <p className="h-look-occ">{occ(OCC[id])} · {t("tapOpen")}</p>
              </Link>
              <Link href={`/${locale}/create?template=${id}`} className="h-look-use">{t("useThis")}</Link>
            </li>
          ))}
        </ul>
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

      <section className="h-final">
        <h2 className="h-h2">{t("finalHeading")}</h2>
        <Link href={`/${locale}/create`} className="h-cta">{t("finalCta")}</Link>
      </section>

      <footer className="h-foot">
        <span>{brand("name")}</span>
        <Link href={`/${locale}/privacy`}>{t("privacy")}</Link>
      </footer>
    </div>
  );
}
