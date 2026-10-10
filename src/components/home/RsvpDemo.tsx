"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Status = "coming" | "maybe" | "no";

function useTween(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { from.current = target; setV(target); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const start = performance.now(), a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      const val = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3)));
      setV(val); from.current = val;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

// A playable preview of what the host sees: tap a reply and the live headcount moves.
export default function RsvpDemo() {
  const t = useTranslations("Home.demo");
  const [status, setStatus] = useState<Status | null>(null);
  const [people, setPeople] = useState(2);
  const base = 8; // Sharma 5 + Verma 3
  const total = base + (status === "coming" ? people : 0);
  const shown = useTween(total);

  const opts: [Status, string][] = [["coming", t("coming")], ["maybe", t("maybe")], ["no", t("no")]];

  return (
    <div className="demo">
      <div className="demo-reply">
        <p className="demo-q">{t("question")}</p>
        <div className="demo-opts">
          {opts.map(([s, label]) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className="demo-opt">{label}</button>
          ))}
        </div>
        {status === "coming" && (
          <div className="demo-count">
            <span>{t("howMany")}</span>
            <div className="demo-step">
              <button type="button" aria-label="−" onClick={() => setPeople((p) => Math.max(1, p - 1))}>−</button>
              <b aria-live="polite">{people}</b>
              <button type="button" aria-label="+" onClick={() => setPeople((p) => Math.min(12, p + 1))}>+</button>
            </div>
          </div>
        )}
      </div>

      <div className="demo-host" aria-live="polite">
        <p className="demo-big">{shown}</p>
        <p className="demo-label">{t("label")}</p>
        <ul>
          <li><span>{t("h1")}</span><b>{t("people", { n: 5 })}</b></li>
          <li><span>{t("h2")}</span><b>{t("people", { n: 3 })}</b></li>
          {status && (
            <li className="demo-you"><span>{t("you")}</span><b>{status === "coming" ? t("people", { n: people }) : status === "maybe" ? t("maybe") : t("no")}</b></li>
          )}
        </ul>
      </div>
    </div>
  );
}
