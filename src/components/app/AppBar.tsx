"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import TextSize from "@/components/home/TextSize";

// Top bar for the working screens (create, edit): brand, bigger-text button and language switch.
export default function AppBar() {
  const locale = useLocale();
  const other = locale === "en" ? "hi" : "en";
  const path = usePathname() || `/${locale}`;
  const swapped = path.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  const brand = useTranslations("Brand");
  const lang = useTranslations("Language");

  return (
    <div className="app-bar">
      <div className="app-garland" aria-hidden />
      <header className="app-bar-row">
        <Link href={`/${locale}`} className="app-brand">{brand("name")}</Link>
        <div className="app-bar-r">
          <TextSize />
          <Link href={swapped} hrefLang={other} aria-label={lang("label")} className="app-lang">{lang("switchTo")}</Link>
        </div>
      </header>
    </div>
  );
}
