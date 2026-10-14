"use client";

import { useEffect, useState } from "react";

/**
 * Envelope-opening animation that plays once when a guest first visits an invite.
 * Wraps the entire invite and reveals it after the animation completes.
 * Plays only once per slug (stored in sessionStorage so refreshes replay, but navigating back won't).
 * Respects prefers-reduced-motion by skipping the animation entirely.
 */
export default function InviteOpener({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<"closed" | "opening" | "done">("closed");

  useEffect(() => {
    // Skip animation for reduced motion or if already seen this session
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    const key = `opener:${slug}`;
    try {
      if (sessionStorage.getItem(key)) {
        setPhase("done");
        return;
      }
    } catch { /* storage blocked — play anyway */ }

    // Small delay so the paint settles before animating
    const t1 = setTimeout(() => setPhase("opening"), 120);
    const t2 = setTimeout(() => {
      setPhase("done");
      try { sessionStorage.setItem(key, "1"); } catch { /* ok */ }
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [slug]);

  if (phase === "done") return null;

  return (
    <div className="opener-stage" aria-hidden>
      {/* Envelope back */}
      <div className={`opener-env ${phase === "opening" ? "opener-env--open" : ""}`}>
        {/* The triangular flap that folds up */}
        <div className="opener-flap" />
        {/* Body of the envelope */}
        <div className="opener-body">
          <div className="opener-seal">✉</div>
        </div>
        {/* Card rising out */}
        <div className={`opener-card ${phase === "opening" ? "opener-card--rise" : ""}`}>
          <div className="opener-card-inner">
            <span className="opener-card-text">You&apos;re Invited</span>
            <span className="opener-card-ornament">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
