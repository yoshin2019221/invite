"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { OCCASIONS } from "@/lib/validation";
import { compressImage } from "@/lib/image";
import RichSectionsEditor from "@/components/invite/RichSectionsEditor";
import DownloadCard from "@/components/invite/DownloadCard";
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
  const ai = useTranslations("Describe");
  const locale = useLocale() as "en" | "hi";

  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState<"describe" | "ask" | "occasion" | "template" | "details" | "done">("describe");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; editToken: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [desc, setDesc] = useState("");
  const [sample, setSample] = useState<{ mediaType: string; data: string; preview: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const sampleRef = useRef<HTMLInputElement>(null);
  const [artOpen, setArtOpen] = useState(false);
  const [artText, setArtText] = useState("");
  const [artBusy, setArtBusy] = useState(false);
  const [artMsg, setArtMsg] = useState<string | null>(null);

  const [aiNote, setAiNote] = useState<string | null>(null);
  const [micMsg, setMicMsg] = useState<string | null>(null);
  const [autoArt, setAutoArt] = useState(true);
  const [artDone, setArtDone] = useState(false);

  // Paints artwork from a short English description. If the host already added their own photo, that one stays.
  // Readable date/time for the card text, in the chosen language.
  function fmtDate(date: string, time?: string) {
    const d = new Date(`${date}T${time ?? "12:00"}:00+05:30`);
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
  }
  function fmtTime(date: string, time: string) {
    const d = new Date(`${date}T${time}:00+05:30`);
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(d);
  }
  type CardDetails = { title?: string; hostNames?: string; occasion?: string; dateText?: string; timeText?: string; venue?: string; message?: string; style?: string; language: "en" | "hi" };
  function cardFromDraft(): CardDetails {
    return {
      title: draft.title || undefined,
      hostNames: draft.hostNames || undefined,
      occasion: draft.occasion ?? undefined,
      dateText: draft.date ? fmtDate(draft.date, draft.time || undefined) : undefined,
      timeText: draft.date && draft.time ? fmtTime(draft.date, draft.time) : undefined,
      venue: [draft.venueName, draft.address].filter(Boolean).join(", ") || undefined,
      message: draft.message || undefined,
      style: artText || undefined,
      language: locale,
    };
  }

  // Designs a complete invitation card (names, date, venue drawn into the art) in the sample's style.
  async function makeCard(card: CardDetails) {
    setArtBusy(true);
    setArtMsg(null);
    setArtDone(false);
    try {
      const res = await fetch("/api/v1/ai/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, reference: sample ? { mediaType: sample.mediaType, data: sample.data } : undefined }),
      });
      if (res.status === 429) { setArtMsg(ai("art.busy")); return; }
      if (!res.ok) { setArtMsg(ai("art.failed")); return; }
      const { path } = (await res.json()) as { path: string };
      setDraft((cur) => ({ ...cur, photoPath: path, rich: { ...cur.rich, heroFullCard: true } }));
      setArtDone(true);
      setArtOpen(false);
    } catch {
      setArtMsg(ai("art.failed"));
    } finally {
      setArtBusy(false);
    }
  }

  // Plain decorative background (no text) from a short phrase; the invite lays its own text over it.
  async function makeArt(prompt: string, occasion?: string) {
    if (prompt.trim().length < 3) return;
    setArtBusy(true);
    setArtMsg(null);
    setArtDone(false);
    try {
      const res = await fetch("/api/v1/ai/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), occasion: occasion ?? draft.occasion ?? undefined, reference: sample ? { mediaType: sample.mediaType, data: sample.data } : undefined }),
      });
      if (res.status === 429) { setArtMsg(ai("art.busy")); return; }
      if (!res.ok) { setArtMsg(ai("art.failed")); return; }
      const { path } = (await res.json()) as { path: string };
      setDraft((cur) => ({ ...cur, photoPath: path, rich: { ...cur.rich, heroFullCard: false } }));
      setArtDone(true);
      setArtOpen(false);
    } catch {
      setArtMsg(ai("art.failed"));
    } finally {
      setArtBusy(false);
    }
  }
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCanSpeak(typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)); }, []);

  // Speak instead of typing (Chrome and Android). The words are added to the description box.
  function stopSpeaking() {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }

  function speak() {
    type Rec = {
      lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
      onresult: (e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
      onend: () => void; onerror: (e: { error?: string }) => void; start: () => void; stop: () => void; abort: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setMicMsg(ai("micFailed")); return; }
    if (listening) { stopSpeaking(); return; }
    const r = new Ctor();
    recRef.current = r;
    r.lang = locale === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = true;   // show words as they are spoken
    r.continuous = true;       // keep listening until the host taps Stop
    r.maxAlternatives = 1;
    // Only the words newly finalised in this event are appended (so nothing repeats).
    r.onresult = (e) => {
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalChunk += res[0].transcript + " ";
      }
      if (finalChunk) setDesc((d) => `${d ? d + " " : ""}${finalChunk.trim()}`.slice(0, 1500));
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      const err = e.error;
      setMicMsg(
        err === "not-allowed" || err === "service-not-allowed" ? ai("micDenied")
        : err === "no-speech" ? ai("micNone")
        : err === "aborted" ? null
        : ai("micFailed"),
      );
    };
    setMicMsg(null);
    setListening(true);
    try { r.start(); } catch { setListening(false); setMicMsg(ai("micFailed")); }
  }

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

  async function onSample(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await compressImage(file);
      const data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      setSample({ mediaType: "image/jpeg", data: data.split(",")[1] ?? "", preview: data });
    } catch {
      setAiMsg(ai("errors.image"));
    }
    if (sampleRef.current) sampleRef.current.value = "";
  }

  async function describe() {
    if (!desc.trim() && !sample) return;
    setThinking(true);
    setAiMsg(null);
    setAiNote(null);
    try {
      const res = await fetch("/api/v1/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: desc.trim(), image: sample ? { mediaType: sample.mediaType, data: sample.data } : undefined }),
      });
      if (res.status === 429) { setAiMsg(ai("errors.busy")); return; }
      if (!res.ok) {
        const info = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        setAiMsg(ai("errors.unavailable"));
        setAiNote(`${res.status} ${info.error ?? ""}${info.code ? ` ${info.code}` : ""}`.trim());
        return;
      }
      const { draft: d, questions: qs } = (await res.json()) as {
        draft: {
          occasion: Occasion | null; title: string | null; hostNames: string | null; date: string | null; time: string | null;
          venueName: string | null; address: string | null; message: string | null; templateId: TemplateId | null; artPrompt: string | null;
          itinerary: { name: string; date: string | null; time: string | null; venue: string | null; note: string | null }[];
          story: { title: string; when: string | null; text: string | null }[];
        };
        questions: string[];
      };
      const occ = d.occasion;
      const tplId = d.templateId ?? (occ ? templatesFor(occ)[1] : null) ?? DEFAULT_TEMPLATE;
      setDraft((cur) => ({
        ...cur,
        occasion: occ ?? cur.occasion,
        title: d.title ?? cur.title,
        hostNames: d.hostNames ?? cur.hostNames,
        date: d.date ?? cur.date,
        time: d.time ?? cur.time,
        venueName: d.venueName ?? cur.venueName,
        address: d.address ?? cur.address,
        message: d.message ?? cur.message,
        theme: occ ? (OCCASION_THEME[occ] ?? cur.theme) : cur.theme,
        template: tplId,
        rich: {
          ...cur.rich,
          itinerary: d.itinerary.map((e) => ({
            name: e.name,
            startsAt: e.date ? `${e.date}T${e.time ?? "12:00"}:00+05:30` : undefined,
            venue: e.venue ?? undefined,
            note: e.note ?? undefined,
          })),
          story: d.story.map((x) => ({ title: x.title, when: x.when ?? undefined, text: x.text ?? undefined })),
        },
      }));
      setQuestions(qs);
      setStep(qs.length ? "ask" : "details");
      // Start designing the full invitation card in the background while the host answers the last questions.
      if (d.artPrompt) setArtText(d.artPrompt);
      if (autoArt && (d.title || d.occasion) && !draft.photoPath) {
        void makeCard({
          title: d.title ?? undefined,
          hostNames: d.hostNames ?? undefined,
          occasion: d.occasion ?? undefined,
          dateText: d.date ? fmtDate(d.date, d.time ?? undefined) : undefined,
          timeText: d.date && d.time ? fmtTime(d.date, d.time) : undefined,
          venue: [d.venueName, d.address].filter(Boolean).join(", ") || undefined,
          message: d.message ?? undefined,
          style: d.artPrompt ?? undefined,
          language: locale,
        });
      }
    } catch {
      setAiMsg(ai("errors.unavailable"));
    } finally {
      setThinking(false);
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

  const stepNo = step === "describe" || step === "ask" ? 1 : step === "occasion" || step === "template" ? 2 : step === "details" ? 3 : 0;
  const stepsBar = stepNo ? (
    <ol className="app-steps" aria-label={t("stepsLabel")}>
      {[t("step1"), t("step2"), t("step3")].map((name, n) => (
        <li key={name} className="contents">
          {n > 0 && <span aria-hidden className="app-step-sep" />}
          <span className="app-step" aria-current={stepNo === n + 1 ? "step" : undefined}><b>{n + 1}</b>{name}</span>
        </li>
      ))}
    </ol>
  ) : null;

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

        <section className="flex flex-col items-center gap-3">
          <p className="self-start text-lg font-medium">{created("previewHeading")}</p>
          <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border-2 border-maroon/20 shadow-lg">
            <iframe
              src={`/${locale}/e/${result.slug}`}
              title={created("previewHeading")}
              loading="lazy"
              className="h-[560px] w-full"
            />
          </div>
          <Link href={`/${locale}/e/${result.slug}`} className="text-lg text-maroon underline">
            {created("previewOpen")}
          </Link>
        </section>

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

        <DownloadCard slug={result.slug} locale={locale} />

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

  if (step === "describe") {
    return (
      <div className="flex flex-col gap-6">
        {stepsBar}
        <h1 className="font-display text-4xl text-maroon">{ai("heading")}</h1>
        <p className="text-lg text-ink-soft">{ai("intro")}</p>
        <textarea
          rows={6}
          value={desc}
          maxLength={1500}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={ai("placeholder")}
          aria-label={ai("heading")}
          className={inputClass}
        />
        {canSpeak && (
          <button type="button" onClick={speak} className={`flex items-center justify-center gap-3 rounded-lg border-2 px-6 py-4 text-xl font-semibold active:scale-95 ${listening ? "animate-pulse border-red-700 bg-red-50 text-red-800" : "border-maroon text-maroon"}`}>
            <span aria-hidden>🎤</span>{listening ? ai("micStop") : ai("speak")}
          </button>
        )}
        {listening && <p className="text-base text-ink-soft">{ai("micHint")}</p>}
        {micMsg && <p role="alert" className="text-lg font-medium text-red-800">{micMsg}</p>}
        <div className="flex flex-col items-start gap-3">
          {sample && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sample.preview} alt="" className="h-40 rounded-lg object-cover" />
          )}
          <input ref={sampleRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onSample(e.target.files?.[0])} />
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => sampleRef.current?.click()} className="rounded-lg border-2 border-maroon/40 px-5 py-3 text-lg font-medium text-maroon active:scale-95">
              {sample ? ai("changeSample") : ai("addSample")}
            </button>
            {sample && <button type="button" onClick={() => setSample(null)} className="text-base text-red-800 underline">{ai("removeSample")}</button>}
          </div>
          <p className="text-base text-ink-soft">{ai("sampleHint")}</p>
        </div>
        <label className="flex items-center gap-3 text-lg font-medium">
          <input type="checkbox" checked={autoArt} onChange={(e) => setAutoArt(e.target.checked)} className="h-6 w-6 accent-maroon" />
          <span>✨ {ai("art.auto")}</span>
        </label>
        {aiMsg && <p role="alert" className="text-lg font-medium text-red-800">{aiMsg}</p>}
        {aiNote && <p className="text-sm text-ink-soft">Technical note: {aiNote}</p>}
        <button type="button" disabled={thinking || (!desc.trim() && !sample)} onClick={() => void describe()} className="rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper transition-transform active:scale-95 disabled:opacity-50">
          {thinking ? ai("thinking") : ai("go")}
        </button>
        <button type="button" onClick={() => setStep("occasion")} className="self-center text-lg text-maroon underline">
          {ai("manual")}
        </button>
      </div>
    );
  }

  if (step === "ask") {
    const q = new Set(questions);
    const occ = draft.occasion ?? "party";
    const lab = "mb-2 block text-lg font-medium";
    const ready = (!q.has("occasion") || draft.occasion) && (!q.has("title") || draft.title.trim()) && (!q.has("hostNames") || draft.hostNames.trim()) && (!q.has("date") || draft.date) && (!q.has("time") || draft.time);
    return (
      <div className="flex flex-col gap-6">
        {stepsBar}
        <h1 className="font-display text-4xl text-maroon">{ai("askHeading")}</h1>
        <p className="text-lg text-ink-soft">{ai("askIntro")}</p>
        {q.has("occasion") && (
          <fieldset>
            <legend className={lab}>{ai("qOccasion")}</legend>
            <div className="grid grid-cols-2 gap-3">
              {OCCASIONS.map((o) => (
                <button key={o} type="button" aria-pressed={draft.occasion === o}
                  onClick={() => { update("occasion", o); update("theme", OCCASION_THEME[o] ?? DEFAULT_THEME); if (q.has("style")) update("template", templatesFor(o)[1] ?? DEFAULT_TEMPLATE); }}
                  className={`rounded-xl border-2 px-3 py-4 text-xl font-medium active:scale-95 ${draft.occasion === o ? "border-maroon bg-maroon text-paper" : "border-maroon/25 bg-white/70 text-maroon"}`}>
                  {occasions(o)}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {q.has("title") && (
          <div><label className={lab} htmlFor="q-title">{ai("qTitle")}</label>
            <input id="q-title" className={inputClass} value={draft.title} maxLength={120} onChange={(e) => update("title", e.target.value)} placeholder={t(`hints.title.${occ}`)} /></div>
        )}
        {q.has("hostNames") && (
          <div><label className={lab} htmlFor="q-host">{ai("qHost")}</label>
            <input id="q-host" className={inputClass} value={draft.hostNames} maxLength={120} onChange={(e) => update("hostNames", e.target.value)} placeholder={t("hints.hostNames")} /></div>
        )}
        {(q.has("date") || q.has("time")) && (
          <div className="grid grid-cols-2 gap-4">
            {q.has("date") && (<div><label className={lab} htmlFor="q-date">{ai("qDate")}</label>
              <input id="q-date" type="date" className={inputClass} value={draft.date} onChange={(e) => update("date", e.target.value)} /></div>)}
            {q.has("time") && (<div><label className={lab} htmlFor="q-time">{ai("qTime")}</label>
              <input id="q-time" type="time" className={inputClass} value={draft.time} onChange={(e) => update("time", e.target.value)} /></div>)}
          </div>
        )}
        {q.has("style") && (
          <div className="flex flex-col gap-3">
            <p className={lab}>{ai("qStyle")}</p>
            <TemplatePicker occasion={occ} value={draft.template} onChange={(id) => update("template", id)} />
          </div>
        )}
        <button type="button" disabled={!ready} onClick={() => setStep("details")} className="sticky bottom-4 rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper shadow-lg active:scale-95 disabled:opacity-50">
          {t("continue")}
        </button>
        <button type="button" onClick={() => setStep("describe")} className="self-center text-lg text-maroon underline">{t("back")}</button>
      </div>
    );
  }

  if (step === "occasion") {
    return (
      <div className="flex flex-col gap-6">
        {stepsBar}
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
        {stepsBar}
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
      {stepsBar}
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
        {draft.photoPath && draft.rich.heroFullCard ? (
          <figure className="w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(draft.photoPath)}
              alt={ai("art.previewAlt")}
              className="mx-auto w-full max-w-[340px] rounded-xl shadow-lg"
            />
            <figcaption className="mt-2 text-center text-base text-ink-soft">{ai("art.previewCaption")}</figcaption>
          </figure>
        ) : draft.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(draft.photoPath)}
            alt=""
            className="h-40 w-40 rounded-lg object-cover"
          />
        ) : null}
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

      <div className="flex flex-col gap-3 rounded-2xl border-2 border-maroon/20 bg-white/40 p-4">
        <p className="text-lg font-medium">{ai("art.heading")}</p>
        {artBusy && <p role="status" className="text-lg font-medium text-maroon">🎨 {ai("art.painting")}</p>}
        {artDone && !artBusy && <p role="status" className="text-base text-ink-soft">{sample ? ai("art.readySample") : ai("art.ready")}</p>}
        <button type="button" disabled={artBusy} onClick={() => void makeCard(cardFromDraft())} className="self-start rounded-lg bg-maroon px-6 py-4 text-xl font-semibold text-paper active:scale-95 disabled:opacity-50">
          {artBusy ? ai("art.working") : artDone ? ai("art.again") : ai("art.open")}
        </button>
        {!artOpen ? (
          <button type="button" disabled={artBusy} onClick={() => setArtOpen(true)} className="self-start text-base text-maroon underline">
            {ai("art.plainOpen")}
          </button>
        ) : (
          <>
            <label htmlFor="art" className="text-base text-ink-soft">{ai("art.label")}</label>
            <textarea id="art" rows={2} maxLength={300} className={inputClass} value={artText} onChange={(e) => setArtText(e.target.value)} placeholder={ai("art.placeholder")} />
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={artBusy || artText.trim().length < 3} onClick={() => void makeArt(artText)} className="rounded-lg border-2 border-maroon px-6 py-4 text-lg font-semibold text-maroon active:scale-95 disabled:opacity-50">
                {artBusy ? ai("art.working") : ai("art.make")}
              </button>
              <button type="button" onClick={() => setArtOpen(false)} className="px-4 py-4 text-lg text-maroon underline">{ai("art.cancel")}</button>
            </div>
          </>
        )}
        {artMsg && <p role="alert" className="text-lg font-medium text-red-800">{artMsg}</p>}
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
