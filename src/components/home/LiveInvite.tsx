"use client";
import "@/components/invite/invite.css";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import LottieBg from "@/components/invite/LottieBg";
import { templateFontClass } from "@/lib/template-fonts";
import { TEMPLATE_DEFS, type TemplateId } from "@/lib/templates";

// A real, miniature template hero inside a phone. It re-renders instantly as the visitor picks a celebration.
export default function LiveInvite({ template, kicker, title, hosts, button }: {
  template: TemplateId; kicker: string; title: string; hosts: string; button: string;
}) {
  const locale = useLocale();
  const def = TEMPLATE_DEFS[template];
  const c = def.colors;
  const [date, setDate] = useState<{ day: string; rest: string; time: string } | null>(null);
  const tilt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = new Date(Date.now() + 40 * 86_400_000);
    const loc = locale === "hi" ? "hi-IN" : "en-IN";
    const time = locale === "hi" ? "शाम 6:30 बजे" : "6:30 pm";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate({
      day: new Intl.DateTimeFormat(loc, { day: "numeric" }).format(d),
      rest: new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(d),
      time: `${new Intl.DateTimeFormat(loc, { weekday: "long" }).format(d)}, ${time}`,
    });
  }, [locale]);

  function move(e: React.PointerEvent) {
    const el = tilt.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 14}deg`);
    el.style.setProperty("--rx", `${-y * 10}deg`);
  }
  function leave() {
    tilt.current?.style.setProperty("--ry", "0deg");
    tilt.current?.style.setProperty("--rx", "0deg");
  }

  const style = {
    "--paper": c.paper, "--paper-deep": c.paperDeep, "--ink": c.ink, "--ink-soft": c.inkSoft,
    "--maroon": c.accent, "--maroon-deep": c.accentDeep, "--saffron": c.highlight,
  } as React.CSSProperties;

  return (
    <div className="live-stage env" onPointerMove={move} onPointerLeave={leave}>
      <div aria-hidden className="env-card">
        <span className="env-body" />
        <span className="env-flap" />
        <span className="env-seal">w</span>
      </div>
      <div ref={tilt} className="live-phone env-phone">
        <div className="live-screen">
          <div key={template} style={style} className={`tpl tpl-${def.id} ${def.dark ? "tpl-dark" : ""} ${templateFontClass} mini live-swap`}>
            <header className="hero">
              <LottieBg name={def.lottie ?? "gold-sparkles"} />
              <div className="hero-body">
                <p className="hero-kicker">{kicker}</p>
                <h2 className="hero-title">{title}</h2>
                <p className="hero-hosts">{hosts}</p>
                <div className="hero-date">
                  <span className="hero-date-day">{date?.day ?? "·"}</span>
                  <span className="hero-date-rest">{date?.rest ?? ""}</span>
                </div>
                <p className="hero-time">{date?.time ?? ""}</p>
                <span className="btn-main">{button}</span>
              </div>
            </header>
          </div>
        </div>
      </div>
    </div>
  );
}
