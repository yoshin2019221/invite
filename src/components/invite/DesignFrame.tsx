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
  const srcDoc = useMemo(() => buildSrcDoc(html, vars, lang), [html, vars, lang]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow) return;
      const d = e.data as { type?: string; h?: number } | null;
      if (d?.type === "invite-height" && typeof d.h === "number" && d.h > 200 && d.h < 20000) setH(d.h);
      if (d?.type === "invite-rsvp") document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("message", onMsg);
    // The frame may have loaded (and reported its height) before this listener existed: ask again.
    ref.current?.contentWindow?.postMessage({ type: "invite-ping" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="block w-full border-0"
      style={{ height: fixedHeight ?? h ?? "100dvh" }}
    />
  );
}
