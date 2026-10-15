"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildSrcDoc, type DesignVars } from "@/lib/design-html";

// Shows an AI-designed invite inside a locked-down iframe (scripts only; no same-origin access, no forms,
// no popups, no navigation, no network). The frame grows to fit its page, so the guest scrolls once.
export default function DesignFrame({ html, vars, lang, title, fixedHeight }: {
  html: string;
  vars: DesignVars;
  lang: string;
  title: string;
  fixedHeight?: number; // used by the small live preview
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState<number | null>(null);
  const [locked, setLocked] = useState(false); // an intro (doors, curtain) is covering the page
  const srcDoc = useMemo(() => buildSrcDoc(html, vars, lang), [html, vars, lang]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow) return;
      const d = e.data as { type?: string; h?: number; locked?: boolean } | null;
      if (d?.type === "invite-height") {
        // Tell the page how tall one "vh" really is (screen height, or the fixed preview height).
        ref.current?.contentWindow?.postMessage({ type: "invite-vh", v: (fixedHeight ?? window.innerHeight) / 100 }, "*");
        if (typeof d.h === "number" && d.h > 200 && d.h < 20000) setH(d.h);
        setLocked(!!d.locked);
      }
      if (d?.type === "invite-rsvp") document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("message", onMsg);
    // The frame may have loaded (and reported its height) before this listener existed: ask again.
    ref.current?.contentWindow?.postMessage({ type: "invite-ping" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, [fixedHeight]);

  // While the intro is up the frame is exactly one screen tall and the page cannot scroll away from it.
  // A fallback releases the guest after a while even if the design never opens by itself.
  useEffect(() => {
    if (!locked || fixedHeight) return;
    ref.current?.scrollIntoView({ block: "start" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => { document.body.style.overflow = prev; setLocked(false); }, 15000);
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [locked, fixedHeight]);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="block w-full border-0"
      style={{ height: fixedHeight ?? (locked ? "100dvh" : h ?? "100dvh") }}
    />
  );
}
