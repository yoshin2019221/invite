"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { TemplateId } from "@/lib/templates";
import LiveInvite from "./LiveInvite";

const CHOICES = [
  { occ: "wedding", tpl: "royal", icon: "💍" },
  { occ: "birthday", tpl: "confetti", icon: "🎂" },
  { occ: "housewarming", tpl: "griha", icon: "🏠" },
  { occ: "pooja", tpl: "pooja", icon: "🪔" },
  { occ: "baby", tpl: "blossom", icon: "🍼" },
  { occ: "party", tpl: "night", icon: "🎉" },
] as const;

export default function Hero() {
  const t = useTranslations("Home");
  const live = useTranslations("Home.live");
  const occasions = useTranslations("Occasions");
  const locale = useLocale();
  const router = useRouter();
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const pick = CHOICES[i];
  const shown = name.trim() || live(`names.${pick.occ}`);

  function go() {
    try {
      window.localStorage.setItem("gharinvite:draft", JSON.stringify({
        occasion: pick.occ,
        title: live(`titles.${pick.occ}`, { name: shown }),
        template: pick.tpl as TemplateId,
      }));
    } catch {
      // ignore: the create page works without it
    }
    router.push(`/${locale}/create`);
  }

  return (
    <div className="h-hero-grid">
      <div className="h-copy">
        <h1 className="h-title">{t("headline")}</h1>
        <p className="h-sub">{t("subline")}</p>

        <div className="h-try" role="group" aria-label={live("question")}>
          <p className="h-try-q">{live("question")}</p>
          <div className="h-chips">
            {CHOICES.map((c, n) => (
              <button key={c.occ} type="button" aria-pressed={n === i} onClick={() => setI(n)} className="h-chip">
                <span aria-hidden className="h-chip-i">{c.icon}</span>
                {occasions(c.occ)}
              </button>
            ))}
          </div>
          <label className="h-try-q" htmlFor="h-name">{live("label")}</label>
          <input id="h-name" className="h-input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder={live(`names.${pick.occ}`)} />
          <div className="h-actions">
            <button type="button" onClick={go} className="h-cta">{live("cta")}</button>
            <a href="#designs" className="h-link">{t("ctaSee")}</a>
          </div>
        </div>
        <p className="h-note">{t("note")}</p>
      </div>

      <div className="h-phones">
        <LiveInvite
          template={pick.tpl}
          kicker={occasions(pick.occ)}
          title={live(`titles.${pick.occ}`, { name: shown })}
          hosts={live("hosts")}
          button={live("button")}
        />
        <p className="h-live-hint">{live("hint")}</p>
      </div>
    </div>
  );
}
