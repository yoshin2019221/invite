"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import RichSectionsEditor from "@/components/invite/RichSectionsEditor";
import type { Rich } from "@/lib/rich";
import type { ThemeId } from "@/lib/themes";

export type EditValues = {
  title: string;
  hostNames: string;
  date: string;
  time: string;
  venueName: string;
  address: string;
  mapUrl: string;
  message: string;
  theme: ThemeId;
  rich: Rich;
};

const inputClass =
  "w-full rounded-lg border-2 border-maroon/25 bg-white/70 px-4 py-4 text-xl text-ink focus:border-maroon focus:outline-none aria-[invalid=true]:border-red-700";

export default function EditForm({ token, initial, occasion }: { token: string; initial: EditValues; occasion: string }) {
  const t = useTranslations("Edit");
  const c = useTranslations("Create");
  const ai = useTranslations("Describe");
  const ed = useTranslations("Editor");
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error" | "required">("idle");
  const [brief, setBrief] = useState(initial.rich.designPrompt ?? "");
  const [designFailed, setDesignFailed] = useState(false);

  function set<K extends keyof EditValues>(key: K, value: EditValues[K]) {
    setV((x) => ({ ...x, [key]: value }));
    setState("idle");
  }

  async function save() {
    if (!v.title.trim() || !v.hostNames.trim() || !v.date || !v.time) {
      setState("required");
      return;
    }
    setBusy(true);
    setDesignFailed(false);
    try {
      // Custom design: empty text removes it; new or changed text asks the AI for fresh CSS.
      let rich = v.rich;
      const b = brief.trim();
      if (!b) {
        rich = { ...rich, designPrompt: undefined, inviteCSS: undefined };
      } else if (b !== (rich.designPrompt ?? "") || !rich.inviteCSS) {
        let css: string | undefined;
        try {
          const r = await fetch("/api/v1/ai/invite-css", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ designPrompt: b, occasion, title: v.title.trim() }),
          });
          css = r.ok ? ((await r.json()) as { css?: string }).css : undefined;
        } catch { /* keep the old design */ }
        if (css) rich = { ...rich, designPrompt: b, inviteCSS: css };
        else setDesignFailed(true);
      }
      const res = await fetch(`/api/v1/edit/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: v.title.trim(),
          hostNames: v.hostNames.trim(),
          startsAt: `${v.date}T${v.time}:00+05:30`,
          venueName: v.venueName.trim() || undefined,
          address: v.address.trim() || undefined,
          mapUrl: v.mapUrl.trim() || undefined,
          message: v.message.trim() || undefined,
          theme: v.theme,
          rich,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setV((x) => ({ ...x, rich }));
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const label = "mb-2 block text-lg font-medium";
  const bad = (b: boolean) => (state === "required" && b ? true : undefined);

  return (
    <form
      className="flex flex-col gap-5 rounded-lg bg-white/50 p-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="font-display text-3xl text-maroon">{t("editHeading")}</h2>
      <div>
        <label className={label} htmlFor="e-title">{c("fields.title")}</label>
        <input id="e-title" className={inputClass} value={v.title} maxLength={120}
          aria-invalid={bad(!v.title.trim())} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="e-host">{c("fields.hostNames")}</label>
        <input id="e-host" className={inputClass} value={v.hostNames} maxLength={120}
          aria-invalid={bad(!v.hostNames.trim())} onChange={(e) => set("hostNames", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="e-date">{c("fields.date")}</label>
          <input id="e-date" type="date" className={inputClass} value={v.date}
            aria-invalid={bad(!v.date)} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="e-time">{c("fields.time")}</label>
          <input id="e-time" type="time" className={inputClass} value={v.time}
            aria-invalid={bad(!v.time)} onChange={(e) => set("time", e.target.value)} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="e-venue">{c("fields.venueName")}</label>
        <input id="e-venue" className={inputClass} value={v.venueName} maxLength={120}
          onChange={(e) => set("venueName", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="e-address">{c("fields.address")}</label>
        <textarea id="e-address" rows={2} className={inputClass} value={v.address} maxLength={300}
          onChange={(e) => set("address", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="e-map">{c("fields.mapUrl")}</label>
        <input id="e-map" type="url" inputMode="url" className={inputClass} value={v.mapUrl}
          onChange={(e) => set("mapUrl", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="e-message">{c("fields.message")}</label>
        <textarea id="e-message" rows={3} className={inputClass} value={v.message} maxLength={600}
          onChange={(e) => set("message", e.target.value)} />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-maroon/20 bg-white/40 p-4">
        <h3 className={label}>{ai("design.heading")}</h3>
        <label htmlFor="e-brief" className="text-base text-ink-soft">{ai("design.label")}</label>
        <textarea id="e-brief" rows={5} maxLength={1800} className={inputClass} value={brief}
          onChange={(e) => { setBrief(e.target.value); setState("idle"); }} placeholder={ai("design.placeholder")} />
        <p className="text-sm text-ink-soft">{ai("design.hint")}</p>
        {designFailed && <p role="status" className="text-base text-ink-soft">{ai("design.failed")}</p>}
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="font-display text-2xl text-maroon">{ed("heading")}</h3>
        <RichSectionsEditor value={v.rich} onChange={(r) => set("rich", r)} />
      </div>

      {state === "required" && <p role="alert" className="text-lg font-medium text-red-800">{c("errors.required")}</p>}
      {state === "error" && <p role="alert" className="text-lg font-medium text-red-800">{c("errors.generic")}</p>}
      {state === "saved" && <p role="status" className="text-lg font-medium text-maroon">{t("saved")}</p>}

      <button type="submit" disabled={busy}
        className="rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper active:scale-95 disabled:opacity-60">
        {busy ? (brief.trim() ? ai("design.working") : t("saving")) : t("save")}
      </button>
      <p className="text-base text-ink-soft">{t("previewNote")}</p>
    </form>
  );
}
