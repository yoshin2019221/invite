"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import RichSectionsEditor from "@/components/invite/RichSectionsEditor";
import TemplatePicker from "@/components/invite/TemplatePicker";
import type { Rich } from "@/lib/rich";
import { TEMPLATE_DEFS, type TemplateId } from "@/lib/templates";
import { THEMES, THEME_COLORS, type ThemeId } from "@/lib/themes";

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
  template: TemplateId;
  rich: Rich;
};

const inputClass =
  "w-full rounded-lg border-2 border-maroon/25 bg-white/70 px-4 py-4 text-xl text-ink focus:border-maroon focus:outline-none aria-[invalid=true]:border-red-700";

export default function EditForm({ token, initial, occasion }: { token: string; initial: EditValues; occasion: string }) {
  const t = useTranslations("Edit");
  const c = useTranslations("Create");
  const themes = useTranslations("Themes");
  const tpl = useTranslations("Templates");
  const ed = useTranslations("Editor");
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error" | "required">("idle");

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
    try {
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
          template: v.template,
          rich: TEMPLATE_DEFS[v.template].rich ? v.rich : undefined,
        }),
      });
      if (!res.ok) throw new Error("save failed");
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
      <div className="flex flex-col gap-3">
        <h3 className={label}>{tpl("heading")}</h3>
        <TemplatePicker occasion={occasion} value={v.template} onChange={(id) => set("template", id)} />
      </div>
      {TEMPLATE_DEFS[v.template].rich ? (
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-2xl text-maroon">{ed("heading")}</h3>
          <RichSectionsEditor value={v.rich} onChange={(r) => set("rich", r)} />
        </div>
      ) : (
      <fieldset>
        <legend className={label}>{c("themeHeading")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((id) => {
            const col = THEME_COLORS[id];
            const on = v.theme === id;
            return (
              <button key={id} type="button" aria-pressed={on} onClick={() => set("theme", id)}
                style={{ backgroundColor: col.paper, borderColor: on ? col.accent : "transparent", color: col.accent }}
                className={`flex flex-col items-center gap-2 rounded-xl border-4 px-3 py-4 text-lg font-semibold active:scale-95 ${on ? "" : "outline outline-1 outline-black/15"}`}>
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: col.accent }} />
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: col.highlight }} />
                </span>
                {themes(id)}
              </button>
            );
          })}
        </div>
      </fieldset>
      )}

      {state === "required" && <p role="alert" className="text-lg font-medium text-red-800">{c("errors.required")}</p>}
      {state === "error" && <p role="alert" className="text-lg font-medium text-red-800">{c("errors.generic")}</p>}
      {state === "saved" && <p role="status" className="text-lg font-medium text-maroon">{t("saved")}</p>}

      <button type="submit" disabled={busy}
        className="rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper active:scale-95 disabled:opacity-60">
        {busy ? t("saving") : t("save")}
      </button>
      <p className="text-base text-ink-soft">{t("previewNote")}</p>
    </form>
  );
}
