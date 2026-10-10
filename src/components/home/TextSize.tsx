"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const SIZES = ["", "lg", "xl"] as const;

// Larger text for older eyes. Remembered on this device.
export default function TextSize() {
  const t = useTranslations("Home");
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("winvite:size");
      const n = SIZES.indexOf((v ?? "") as (typeof SIZES)[number]);
      if (n > 0) { setI(n); document.documentElement.dataset.size = SIZES[n]; } // eslint-disable-line react-hooks/set-state-in-effect
    } catch { /* ignore */ }
  }, []);

  function next() {
    const n = (i + 1) % SIZES.length;
    setI(n);
    if (SIZES[n]) document.documentElement.dataset.size = SIZES[n]; else delete document.documentElement.dataset.size;
    try { window.localStorage.setItem("winvite:size", SIZES[n]); } catch { /* ignore */ }
  }

  return (
    <button type="button" onClick={next} className="h-size" aria-label={t("textSize")} title={t("textSize")}>
      <span aria-hidden className="h-size-a">A</span><span aria-hidden className="h-size-A">A</span>
    </button>
  );
}
