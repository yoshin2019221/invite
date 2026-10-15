"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LiveInvite from "./LiveInvite";

const CHOICES = [
  { occ: "wedding", icon: "💍" },
  { occ: "birthday", icon: "🎂" },
  { occ: "housewarming", icon: "🏠" },
  { occ: "pooja", icon: "🪔" },
  { occ: "baby", icon: "🍼" },
  { occ: "party", icon: "🎉" },
] as const;

export default function Hero() {
  const t = useTranslations("Home");
  const live = useTranslations("Home.live");
  const occasions = useTranslations("Occasions");
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const pick = CHOICES[i];
  const shown = name.trim() || live(`names.${pick.occ}`);

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
        </div>
      </div>

      <div className="h-phones">
        <LiveInvite
          occasion={pick.occ}
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
