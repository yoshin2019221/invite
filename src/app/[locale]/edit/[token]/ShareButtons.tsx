"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Host-side sharing: send the invite, send a reminder, copy the guest link.
export default function ShareButtons({
  guestUrl,
  inviteText,
  reminderText,
}: {
  guestUrl: string;
  inviteText: string;
  reminderText: string;
}) {
  const t = useTranslations("Edit");
  const [copied, setCopied] = useState(false);
  const wa = (text: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${guestUrl}`)}`;
  const btn = "rounded-lg border-2 border-maroon px-5 py-3 text-lg font-semibold text-maroon active:scale-95";

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-3xl text-maroon">{t("shareHeading")}</h2>
      <p className="break-all rounded-lg bg-white/70 p-3 text-base">{guestUrl}</p>
      <div className="flex flex-wrap gap-3">
        <a href={wa(inviteText)} target="_blank" rel="noreferrer"
          className="rounded-lg bg-maroon px-5 py-3 text-lg font-semibold text-paper active:scale-95">
          {t("sendInvite")}
        </a>
        <a href={wa(reminderText)} target="_blank" rel="noreferrer" className={btn}>
          {t("sendReminder")}
        </a>
        <button
          type="button"
          className={btn}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(guestUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // ignore
            }
          }}
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </section>
  );
}
