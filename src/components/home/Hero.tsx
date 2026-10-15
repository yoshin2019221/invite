"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LiveInvite from "./LiveInvite";

export default function Hero() {
  const t = useTranslations("Home");
  const live = useTranslations("Home.live");
  const occasions = useTranslations("Occasions");
  const ai = useTranslations("Home.ai");
  const [prompt, setPrompt] = useState("");
  const [soon, setSoon] = useState(false);

  return (
    <div className="h-hero-grid">
      <div className="h-copy">
        <h1 className="h-title">{t("headline")}</h1>
        <p className="h-sub">{t("subline")}</p>

        <div className="h-ai" role="group" aria-label={ai("heading")}>
          <label htmlFor="h-ai" className="h-ai-h">✨ {ai("heading")}</label>
          <textarea
            id="h-ai"
            className="h-ai-box"
            rows={4}
            maxLength={4000}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setSoon(false); }}
            placeholder={ai("placeholder")}
          />
          <p className="h-ai-note">{ai("note")}</p>
          <button type="button" onClick={() => setSoon(true)} className="h-cta h-cta-ai">{ai("cta")}</button>
          {soon && <p role="status" className="h-ai-hint">{ai("soon")}</p>}
        </div>
      </div>

      <div className="h-phones">
        <LiveInvite
          occasion="wedding"
          kicker={occasions("wedding")}
          title={live("titles.wedding", { name: live("names.wedding") })}
          hosts={live("hosts")}
          button={live("button")}
        />
        <p className="h-live-hint">{live("hint")}</p>
      </div>
    </div>
  );
}
