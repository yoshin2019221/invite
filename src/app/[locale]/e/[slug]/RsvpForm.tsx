"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Status = "coming" | "maybe" | "not_coming";
type Saved = {
  deviceToken: string;
  guestName: string;
  status: Status;
  headcount: number;
  note: string;
};

const STATUSES: Status[] = ["coming", "maybe", "not_coming"];
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => void;
};

function newDeviceToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function RsvpForm({ slug }: { slug: string }) {
  const t = useTranslations("Rsvp");
  const key = `gharinvite:rsvp:${slug}`;

  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [editing, setEditing] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [headcount, setHeadcount] = useState(2);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [hToken, setHToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Restore this device's earlier reply (browser storage only exists on the client).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get("h");
    if (h && /^[A-Za-z0-9_-]{8,32}$/.test(h)) {
      // Personal link: the server knows this household's name and any earlier reply.
      setHToken(h);
      fetch(`/api/v1/events/${slug}/household?t=${encodeURIComponent(h)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { name: string; reply: { guest_name: string; status: Status; headcount: number; note: string | null } | null } | null) => {
          if (d) {
            setGuestName(d.reply?.guest_name ?? d.name);
            if (d.reply) {
              setStatus(d.reply.status);
              setHeadcount(d.reply.headcount || 2);
              setNote(d.reply.note ?? "");
              setSaved({
                deviceToken: "",
                guestName: d.reply.guest_name,
                status: d.reply.status,
                headcount: d.reply.headcount,
                note: d.reply.note ?? "",
              });
              setEditing(false);
            }
          }
        })
        .catch(() => undefined)
        .finally(() => setLoaded(true));
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        setSaved(s);
        setGuestName(s.guestName);
        setStatus(s.status);
        setHeadcount(s.headcount || 2);
        setNote(s.note);
        setEditing(false);
      }
    } catch {
      // storage unavailable: show the empty form
    }
    setLoaded(true);
  }, [key, slug]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!SITE_KEY || !editing || !widgetRef.current) return;
    const el = widgetRef.current;
    const mount = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (api && !el.hasChildNodes()) api.render(el, { sitekey: SITE_KEY, callback: setTurnstileToken });
    };
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) {
      mount();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = mount;
    document.head.appendChild(script);
  }, [editing, loaded]);

  async function submit() {
    setShowErrors(true);
    if (!guestName.trim() || !status) {
      setError(t("errors.required"));
      return;
    }
    setBusy(true);
    setError(null);
    const deviceToken = saved?.deviceToken || newDeviceToken();
    const count = status === "not_coming" ? 0 : headcount;
    try {
      const res = await fetch(`/api/v1/events/${slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestName.trim(),
          status,
          headcount: count,
          note: note.trim() || undefined,
          deviceToken,
          turnstileToken,
          householdToken: hToken ?? undefined,
        }),
      });
      if (res.status === 429) {
        setError(t("errors.tooMany"));
        return;
      }
      if (!res.ok) throw new Error("rsvp failed");
      const next: Saved = { deviceToken, guestName: guestName.trim(), status, headcount: count, note: note.trim() };
      try {
        if (!hToken) window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore: the reply is saved on the server either way
      }
      setSaved(next);
      setEditing(false);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <div className="min-h-40" />;

  const card = "flex flex-col gap-5 rounded-3xl border-2 border-maroon/40 bg-white/55 p-5 sm:p-8";

  if (saved && !editing) {
    return (
      <section className={`${card} items-center text-center`} aria-live="polite">
        <h2 className="font-display text-3xl text-maroon">{t("thanksHeading")}</h2>
        <p className="text-xl text-ink">
          {saved.status === "coming" && t("thanksComing", { name: saved.guestName, count: saved.headcount })}
          {saved.status === "maybe" && t("thanksMaybe", { name: saved.guestName })}
          {saved.status === "not_coming" && t("thanksNo", { name: saved.guestName })}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border-2 border-maroon px-6 py-3 text-lg font-semibold text-maroon active:scale-95"
        >
          {t("change")}
        </button>
      </section>
    );
  }

  const input =
    "w-full rounded-lg border-2 border-maroon/25 bg-white/80 px-4 py-4 text-xl text-ink placeholder:text-ink-soft/50 focus:border-maroon focus:outline-none aria-[invalid=true]:border-red-700";

  return (
    <form
      className={card}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-center font-display text-3xl text-maroon">{t("heading")}</h2>

      <div>
        <label htmlFor="guestName" className="mb-2 block text-lg font-medium">{t("name")}</label>
        <input
          id="guestName"
          className={input}
          value={guestName}
          maxLength={80}
          placeholder={t("namePlaceholder")}
          aria-invalid={showErrors && !guestName.trim() ? true : undefined}
          onChange={(e) => setGuestName(e.target.value)}
        />
      </div>

      <div role="group" aria-label={t("heading")} className="flex flex-col gap-3">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`rounded-xl border-2 px-5 py-4 text-xl font-semibold transition-transform active:scale-[0.98] ${
              status === s
                ? "border-maroon bg-maroon text-paper"
                : showErrors && !status
                  ? "border-red-700 bg-white/80 text-maroon"
                  : "border-maroon/30 bg-white/80 text-maroon"
            }`}
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>

      {status && status !== "not_coming" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium">{t("headcount")}</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              aria-label="−"
              disabled={headcount <= 1}
              onClick={() => setHeadcount((n) => Math.max(1, n - 1))}
              className="h-14 w-14 rounded-full border-2 border-maroon text-3xl text-maroon active:scale-95 disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-12 text-center font-display text-5xl text-maroon" aria-live="polite">
              {headcount}
            </span>
            <button
              type="button"
              aria-label="+"
              disabled={headcount >= 12}
              onClick={() => setHeadcount((n) => Math.min(12, n + 1))}
              className="h-14 w-14 rounded-full border-2 border-maroon text-3xl text-maroon active:scale-95 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="note" className="mb-2 block text-lg font-medium">{t("note")}</label>
        <textarea
          id="note"
          rows={2}
          className={input}
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {SITE_KEY && <div ref={widgetRef} />}

      {error && (
        <p role="alert" className="text-lg font-medium text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-maroon px-8 py-5 text-xl font-semibold text-paper transition-transform active:scale-95 disabled:opacity-60"
      >
        {busy ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
