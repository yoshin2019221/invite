"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { TemplateId } from "@/lib/templates";
import LiveInvite from "./LiveInvite";

const CHOICES = [
  { occ: "wedding", tpl: "royal", icon: "💍" },
  { occ: "birthday", tpl: "confetti", icon: "🎂" },
  { occ: "housewarming", tpl: "griha", icon: "🏠" },
  { occ: "pooja", tpl: "pooja", icon: "🪔" },
  { occ: "baby", tpl: "blossom", icon: "🍼" },
  { occ: "party", tpl: "night", icon: "🎉" },
] as const;

export default function Hero() {
  const t = useTranslations("Home");
  const live = useTranslations("Home.live");
  const occasions = useTranslations("Occasions");
  const locale = useLocale();
  const router = useRouter();
  const ai = useTranslations("Home.ai");
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [micMsg, setMicMsg] = useState<string | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const pick = CHOICES[i];
  const shown = name.trim() || live(`names.${pick.occ}`);

  useEffect(() => { setCanSpeak(typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)); }, []);

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
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalChunk += res[0].transcript + " ";
      }
      if (finalChunk) setPrompt((d) => `${d ? d + " " : ""}${finalChunk.trim()}`.slice(0, 4000));
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

  function go() {
    try {
      window.localStorage.setItem("gharinvite:draft", JSON.stringify({
        occasion: pick.occ,
        title: live(`titles.${pick.occ}`, { name: shown }),
        template: pick.tpl as TemplateId,
      }));
    } catch {
      // ignore: the create page works without it
    }
    router.push(`/${locale}/create`);
  }

  // Free-text AI start: send the host's words to the create page, which runs the AI automatically.
  function goAi() {
    const text = prompt.trim();
    if (!text) { router.push(`/${locale}/create`); return; }
    router.push(`/${locale}/create?desc=${encodeURIComponent(text)}&go=1`);
  }

  return (
    <div className="h-hero-grid">
      <div className="h-copy">
        <h1 className="h-title">{t("headline")}</h1>
        <p className="h-sub">{t("subline")}</p>

        <div className="h-ai" role="group" aria-label={ai("heading")}>
          <p className="h-ai-h">✨ {ai("heading")}</p>
          <textarea
            id="h-ai"
            className="h-ai-box"
            rows={3}
            maxLength={4000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={ai("placeholder")}
          />
          <div className="h-ai-actions">
            {canSpeak && (
              <button type="button" onClick={speak} className={`h-mic ${listening ? "h-mic-on" : ""}`}>
                <span aria-hidden>🎤</span>{listening ? ai("micStop") : ai("mic")}
              </button>
            )}
          </div>
          {listening && <p className="h-ai-hint">{ai("micHint")}</p>}
          {micMsg && <p className="h-ai-hint h-ai-err">{micMsg}</p>}
          <p className="h-ai-note">{ai("note")}</p>
          <button type="button" onClick={goAi} className="h-cta h-cta-ai">{ai("cta")}</button>
        </div>

        <div className="h-try" role="group" aria-label={live("question")}>
          <p className="h-try-q">{live("question")}</p>
          <div className="h-chips">
            {CHOICES.map((c, n) => (
              <button key={c.occ} type="button" aria-pressed={n === i} onClick={() => setI(n)} className="h-chip">
                <span aria-hidden className="h-chip-i">{c.icon}</span>
                {occasions(c.occ)}
              </button>
            ))}
          </div>
          <label className="h-try-q" htmlFor="h-name">{live("label")}</label>
          <input id="h-name" className="h-input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder={live(`names.${pick.occ}`)} />
          <div className="h-actions">
            <button type="button" onClick={go} className="h-cta">{live("cta")}</button>
            <a href="#designs" className="h-link">{t("ctaSee")}</a>
          </div>
        </div>
      </div>

      <div className="h-phones">
        <LiveInvite
          template={pick.tpl}
          kicker={occasions(pick.occ)}
          title={live(`titles.${pick.occ}`, { name: shown })}
          hosts={live("hosts")}
          button={live("button")}
        />
        <p className="h-live-hint">{live("hint")}</p>
      </div>
    </div>
  );
}
