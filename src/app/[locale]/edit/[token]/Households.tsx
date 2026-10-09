"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export type HouseholdRow = {
  id: string;
  name: string;
  link: string;
  status: "coming" | "maybe" | "not_coming" | null;
  headcount: number;
};

export default function Households({
  token,
  title,
  when,
  rows,
}: {
  token: string;
  title: string;
  when: string;
  rows: HouseholdRow[];
}) {
  const t = useTranslations("Households");
  const router = useRouter();
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function add() {
    const list = names.split("\n").map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/v1/edit/${token}/households`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: list }),
      });
      if (!res.ok) throw new Error("add failed");
      setNames("");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("removeConfirm"))) return;
    try {
      const res = await fetch(`/api/v1/edit/${token}/households/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove failed");
      router.refresh();
    } catch {
      setError(true);
    }
  }

  const wa = (text: string, link: string) =>
    `https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`;
  const pending = rows.filter((r) => !r.status).length;
  const small =
    "rounded-md border-2 border-maroon/40 px-3 py-2 text-base font-medium text-maroon active:scale-95";

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl text-maroon">{t("heading")}</h2>
      <p className="text-lg text-ink-soft">{t("intro")}</p>

      <div>
        <label htmlFor="hh-names" className="mb-2 block text-lg font-medium">{t("namesLabel")}</label>
        <textarea
          id="hh-names"
          rows={4}
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={t("namesPlaceholder")}
          className="w-full rounded-lg border-2 border-maroon/25 bg-white/70 px-4 py-3 text-xl focus:border-maroon focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || !names.trim()}
          onClick={() => void add()}
          className="mt-3 rounded-lg bg-maroon px-6 py-3 text-lg font-semibold text-paper active:scale-95 disabled:opacity-60"
        >
          {busy ? t("adding") : t("add")}
        </button>
        {error && <p role="alert" className="mt-2 text-lg font-medium text-red-800">{t("error")}</p>}
      </div>

      {rows.length > 0 && (
        <>
          <p className="text-lg font-medium">{t("pending", { count: pending })}</p>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-lg bg-white/70 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xl font-medium">{r.name}</p>
                  <p className="whitespace-nowrap text-lg font-semibold text-maroon">
                    {r.status === "coming" && t("coming", { count: r.headcount })}
                    {r.status === "maybe" && t("maybe")}
                    {r.status === "not_coming" && t("no")}
                    {!r.status && <span className="text-ink-soft">{t("waiting")}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className={small}
                    target="_blank"
                    rel="noreferrer"
                    href={wa(t("inviteText", { name: r.name, title }), r.link)}
                  >
                    {t("sendInvite")}
                  </a>
                  {!r.status && (
                    <a
                      className={small}
                      target="_blank"
                      rel="noreferrer"
                      href={wa(t("remindText", { name: r.name, title, when }), r.link)}
                    >
                      {t("remind")}
                    </a>
                  )}
                  <button
                    type="button"
                    className={`${small} border-red-800/40 text-red-800`}
                    onClick={() => void remove(r.id)}
                  >
                    {t("remove")}
                  </button>
                  <button
                    type="button"
                    className={small}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(r.link);
                        setCopied(r.id);
                        setTimeout(() => setCopied(null), 2000);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    {copied === r.id ? t("copied") : t("copyLink")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
