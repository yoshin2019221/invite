"use client";

import { useEffect, useRef } from "react";

// Plays a looping Lottie JSON animation behind the hero. Skipped for reduced-motion visitors.
export default function LottieBg({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let anim: { destroy: () => void; play: () => void; pause: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const lottie = (await import("lottie-web/build/player/lottie_light")).default;
      const data = await fetch(`/lottie/${name}.json`).then((r) => r.json());
      if (cancelled) return;
      anim = lottie.loadAnimation({
        container: el, renderer: "svg", loop: true, autoplay: true, animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
      });
    })().catch(() => {});
    const onVis = () => (document.hidden ? anim?.pause() : anim?.play());
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); anim?.destroy(); };
  }, [name]);

  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" />;
}
