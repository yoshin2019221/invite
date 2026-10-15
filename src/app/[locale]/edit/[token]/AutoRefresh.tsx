"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Keeps the host's headcount live: re-reads the page data every 20 seconds while visible.
export default function AutoRefresh() {
  const router = useRouter();
  const t = useTranslations("Edit");
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 20000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="self-start rounded-md border border-maroon/30 px-4 py-2 text-base text-maroon active:scale-95"
    >
      {t("refresh")}
    </button>
  );
}
