"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function DeleteInvite({ token, locale }: { token: string; locale: string }) {
  const t = useTranslations("Edit");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/v1/edit/${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.push(`/${locale}`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-maroon/20 pt-6">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start rounded-lg border-2 border-red-800/60 px-5 py-3 text-lg font-medium text-red-800 active:scale-95"
        >
          {t("delete")}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-red-800/60 bg-red-50 p-4">
          <p className="text-lg">{t("deleteConfirm")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-lg bg-red-800 px-5 py-3 text-lg font-semibold text-white active:scale-95 disabled:opacity-60"
            >
              {t("deleteYes")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border-2 border-maroon/30 px-5 py-3 text-lg text-maroon active:scale-95"
            >
              {t("deleteNo")}
            </button>
          </div>
          {failed && <p role="alert" className="text-red-800">{t("deleteFailed")}</p>}
        </div>
      )}
    </section>
  );
}
