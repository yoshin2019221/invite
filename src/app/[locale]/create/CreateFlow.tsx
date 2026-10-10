"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { OCCASIONS } from "@/lib/validation";
import RichSectionsEditor from "@/components/invite/RichSectionsEditor";
import TemplatePicker from "@/components/invite/TemplatePicker";
import { EMPTY_RICH, type Rich } from "@/lib/rich";
import { DEFAULT_TEMPLATE, TEMPLATE_DEFS, templatesFor, type TemplateId } from "@/lib/templates";
import { photoUrl, uploadPhoto } from "@/lib/upload-client";
import { DEFAULT_THEME, OCCASION_THEME, THEMES, THEME_COLORS, type ThemeId } from "@/lib/themes";

type Occasion = (typeof OCCASIONS)[number];

type Draft = {
  occasion: Occasion | null;
  title: string;
  hostNames: string;
  date: string;
  time: string;
  venueName: string;
  address: string;
  mapUrl: string;
  message: string;
  photoPath: string | null;
  theme: ThemeId;
  template: TemplateId;
  rich: Rich;
};

const EMPTY: Draft = {
  occasion: null,
  title: "",
  hostNames: "",
  date: "",
  time: "",
  venueName: "",
  address: "",
  mapUrl: "",
  message: "",
  photoPath: null,
  theme: DEFAULT_THEME,
  template: DEFAULT_TEMPLATE,
  rich: EMPTY_RICH,
};

const DRAFT_KEY = "gharinvite:draft";
const EVENTS_KEY = "gharinvite:events";

const inputClass =
  "w-full rounded-lg border-2 border-maroon/25 bg-white/70 px-4 py-4 text-xl text-ink placeholder:text-ink-soft/50 focus:border-maroon focus:outline-none aria-[invalid=true]:border-red-700";

export default function CreateFlow() {
  const t = useTranslations("Create");
  const occasions = useTranslations("Occasions");
  const created = useTranslations("Created");
  const themes = useTranslations("Themes");
  const tpl = useTranslations("Templates");
  const ed = useTranslations("Editor");
  const locale = useLocale() as "en" | "hi";

  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState<"occasion" | "template" | "details" | "done">("occasion");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; editToken: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // One-time restore of an unfinished draft; localStorage only exists in the browser.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = { ...EMPTY, ...JSON.parse(saved) } as Draft;
        setDraft(parsed);
        if (parsed.occasion) {
          setStep("details");
          setRestored(true);
        }
      }
    } catch {
      // storage unavailable: start fresh
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded || step === "done") return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft, loaded, step]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const missing = {
    title: !draft.title.trim(),
    hostNames: !draft.hostNames.trim(),
    date: !draft.date,
    time: !draft.time,
  };
  const hasMissing = Object.values(missing).some(Boolean);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setMessage(null);
    try {
      const path = await uploadPhoto(file);
      update("photoPath", path);
    } catch {
      setMessage(t("errors.photo"));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    setShowErrors(true);
    if (hasMissing || !draft.occasion) {
      setMessage(t("errors.required"));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: draft.occasion,
          title: draft.title.trim(),
          hostNames: draft.hostNames.trim(),
          startsAt: `${draft.date}T${draft.time}:00+05:30`,
          timezone: "Asia/Kolkata",
          venueName: draft.venueName.trim() || undefined,
          address: draft.address.trim() || undefined,
          mapUrl: draft.mapUrl.trim() || undefined,
          message: draft.message.trim() || undefined,
          language: locale,
          photoPath: draft.photoPath ?? undefined,
          theme: draft.theme,
          template: draft.template,
          rich: TEMPLATE_DEFS[draft.template].rich ? draft.rich : undefined,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { slug: string; editToken: string };
      try {
        const list = JSON.parse(window.localStorage.getItem(EVENTS_KEY) ?? "[]");
        list.push({ ...data, title: draft.title.trim(), createdAt: Date.now() });
        window.localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setResult(data);
      setStep("done");
    } catch {
      setMessage(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  if (!loaded) return null;

  if (step === "done" && result) {
    const origin = window.location.origin;
    const guestUrl = `${origin}/${locale}/e/${result.slug}`;
    const editUrl = `${origin}/${locale}/edit/${result.editToken}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(
      `${created("shareText", { title: draft.title })}\n${guestUrl}`,
    )}`;
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-display text-4xl text-maroon">{created("heading")}</h1>

        <section className="flex flex-col gap-3">
          <p className="text-lg font-medium">{created("guestLink")}</p>
          <p className="break-all rounded-lg bg-white/70 p-4 text-base">{guestUrl}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-maroon px-6 py-4 text-xl font-semibold text-paper active:scale-95"
            >
              {created("whatsapp")}
            </a>
            <button
              type="button"
              onClick={() => copy("guest", guestUrl)}
              className="rounded-lg border-2 border-maroon px-6 py-4 text-xl font-semibold text-maroon active:scale-95"
            >
              {copied === "guest" ? created("copied") : created("copy")}
            </button>
            <Link
              href={`/${locale}/e/${result.slug}`}
              className="rounded-lg border-2 border-maroon/30 px-6 py-4 text-xl text-maroon active:scale-95"
            >
              {created("view")}
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border-2 border-saffron/60 bg-saffron/10 p-5">
          <p className="text-lg font-medium">{created("editLink")}</p>
          <p className="break-all text-base">{editUrl}</p>
          <p className="text-base text-ink-soft">{created("editWarn")}</p>
          <button
            type="button"
            onClick={() => copy("edit", editUrl)}
            className="self-start rounded-lg border-2 border-maroon px-6 py-3 text-lg font-semibold text-maroon active:scale-95"
          >
            {copied === "edit" ? created("copied") : created("copy")}
          </button>
        </section>
      </div>
    );
  }

  if (step === "occasion") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl text-maroon">{t("occasionHeading")}</h1>
        <div className="grid grid-cols-2 gap-4">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                update("occasion", o);
                update("theme", OCCASION_THEME[o] ?? DEFAULT_THEME);
                update("template", templatesFor(o)[1] ?? DEFAULT_TEMPLATE);
                setStep("template");
              }}
              className={`min-h-28 rounded-xl border-2 px-4 py-6 text-2xl font-medium transition-transform active:scale-95 ${
                draft.occasion === o
                  ? "border-maroon bg-maroon text-paper"
                  : "border-maroon/25 bg-white/70 text-maroon"
              }`}
            >
              {occasions(o)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const occasion = draft.occasion ?? "party";
  const isRich = TEMPLATE_DEFS[draft.template].rich;

  if (step === "template") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-4xl text-maroon">{tpl("heading")}</h1>
          <button type="button" onClick={() => setStep("occasion")} className="rounded-md border border-maroon/30 px-4 py-2 text-base text-maroon">
            {t("back")}
          </button>
        </div>
        <p className="text-lg text-ink-soft">{tpl("intro")}</p>
        <TemplatePicker occasion={occasion} value={draft.template} onChange={(id) => update("template", id)} />
        <button type="button" onClick={() => setStep("details")} className="sticky bottom-4 rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper shadow-lg active:scale-95">
          {t("continue")}
        </button>
      </div>
    );
  }

  const label = "mb-2 block text-lg font-medium";
  const err = (bad: boolean) => (showErrors && bad ? true : undefined);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl text-maroon">{t("detailsHeading")}</h1>
        <button
          type="button"
          onClick={() => setStep("template")}
          className="rounded-md border border-maroon/30 px-4 py-2 text-base text-maroon"
        >
          {occasions(occasion)} · {t("back")}
        </button>
      </div>

      {restored && <p className="text-base text-ink-soft">{t("draftRestored")}</p>}

      <div>
        <label className={label} htmlFor="title">{t("fields.title")}</label>
        <input
          id="title"
          className={inputClass}
          value={draft.title}
          aria-invalid={err(missing.title)}
          placeholder={t(`hints.title.${occasion}`)}
          onChange={(e) => update("title", e.target.value)}
          maxLength={120}
        />
      </div>

      <div>
        <label className={label} htmlFor="hostNames">{t("fields.hostNames")}</label>
        <input
          id="hostNames"
          className={inputClass}
          value={draft.hostNames}
          aria-invalid={err(missing.hostNames)}
          placeholder={t("hints.hostNames")}
          onChange={(e) => update("hostNames", e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="date">{t("fields.date")}</label>
          <input
            id="date"
            type="date"
            className={inputClass}
            value={draft.date}
            aria-invalid={err(missing.date)}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="time">{t("fields.time")}</label>
          <input
            id="time"
            type="time"
            className={inputClass}
            value={draft.time}
            aria-invalid={err(missing.time)}
            onChange={(e) => update("time", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="venueName">{t("fields.venueName")}</label>
        <input
          id="venueName"
          className={inputClass}
          value={draft.venueName}
          onChange={(e) => update("venueName", e.target.value)}
          maxLength={120}
        />
      </div>

      <div>
        <label className={label} htmlFor="address">{t("fields.address")}</label>
        <textarea
          id="address"
          rows={2}
          className={inputClass}
          value={draft.address}
          onChange={(e) => update("address", e.target.value)}
          maxLength={300}
        />
      </div>

      <div>
        <label className={label} htmlFor="mapUrl">{t("fields.mapUrl")}</label>
        <input
          id="mapUrl"
          type="url"
          inputMode="url"
          className={inputClass}
          value={draft.mapUrl}
          onChange={(e) => update("mapUrl", e.target.value)}
        />
      </div>

      <div>
        <label className={label} htmlFor="message">{t("fields.message")}</label>
        <textarea
          id="message"
          rows={3}
          className={inputClass}
          value={draft.message}
          placeholder={t("hints.message")}
          onChange={(e) => update("message", e.target.value)}
          maxLength={600}
        />
      </div>

      {!isRich && (
      <fieldset>
        <legend className={label}>{t("themeHeading")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((id) => {
            const c = THEME_COLORS[id];
            const on = draft.theme === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => update("theme", id)}
                style={{ backgroundColor: c.paper, borderColor: on ? c.accent : "transparent", color: c.accent }}
                className={`flex flex-col items-center gap-2 rounded-xl border-4 px-3 py-4 text-lg font-semibold shadow-sm active:scale-95 ${on ? "" : "outline outline-1 outline-black/15"}`}
              >
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: c.accent }} />
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: c.highlight }} />
                </span>
                {themes(id)}
              </button>
            );
          })}
        </div>
      </fieldset>
      )}

      <div className="flex flex-col items-start gap-3">
        {draft.photoPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(draft.photoPath)}
            alt=""
            className="h-40 w-40 rounded-lg object-cover"
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPhoto(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={photoBusy}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border-2 border-maroon px-6 py-4 text-xl font-semibold text-maroon active:scale-95 disabled:opacity-60"
        >
          {photoBusy
            ? t("fields.photoWorking")
            : draft.photoPath
              ? t("fields.photoChange")
              : t("fields.photo")}
        </button>
      </div>

      {isRich && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-3xl text-maroon">{ed("heading")}</h2>
          <RichSectionsEditor value={draft.rich} onChange={(r) => update("rich", r)} />
        </div>
      )}

      {message && (
        <p role="alert" className="text-lg font-medium text-red-800">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || photoBusy}
        className="rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper transition-transform active:scale-95 disabled:opacity-60"
      >
        {busy ? t("creating") : t("submit")}
      </button>
    </form>
  );
}
