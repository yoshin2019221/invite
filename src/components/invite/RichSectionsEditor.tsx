"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Rich } from "@/lib/rich";

type Row = { name: string; date: string; time: string; venue: string; note: string };

const input = "w-full rounded-lg border-2 border-maroon/25 bg-white/70 px-3 py-3 text-lg text-ink focus:border-maroon focus:outline-none";
const small = "rounded-lg border-2 border-maroon/40 px-4 py-2 text-base font-medium text-maroon active:scale-95 disabled:opacity-50";

function toRow(e: Rich["itinerary"][number]): Row {
  let date = "", time = "";
  if (e.startsAt) {
    const d = new Date(new Date(e.startsAt).getTime() + 330 * 60_000).toISOString();
    date = d.slice(0, 10); time = d.slice(11, 16);
  }
  return { name: e.name, date, time, venue: e.venue ?? "", note: e.note ?? "" };
}

export default function RichSectionsEditor({ value, onChange }: { value: Rich; onChange: (r: Rich) => void }) {
  const t = useTranslations("Editor");
  const [rows, setRows] = useState<Row[]>(() => value.itinerary.map(toRow));

  function setItinerary(next: Row[]) {
    setRows(next);
    onChange({
      ...value,
      itinerary: next.filter((r) => r.name.trim()).map((r) => ({
        name: r.name.trim(),
        startsAt: r.date ? `${r.date}T${r.time || "12:00"}:00+05:30` : undefined,
        venue: r.venue.trim() || undefined,
        note: r.note.trim() || undefined,
      })),
    });
  }
  const patchRow = (i: number, p: Partial<Row>) => setItinerary(rows.map((r, n) => (n === i ? { ...r, ...p } : r)));
  const setStory = (story: Rich["story"]) => onChange({ ...value, story });
  const patchStory = (i: number, p: Partial<Rich["story"][number]>) => setStory(value.story.map((s, n) => (n === i ? { ...s, ...p } : s)));

  const box = "flex flex-col gap-4 rounded-2xl border-2 border-maroon/20 bg-white/40 p-4";
  const h = "font-display text-2xl text-maroon";

  return (
    <div className="flex flex-col gap-6">
      <section className={box}>
        <h3 className={h}>{t("itinerary")}</h3>
        <p className="text-base text-ink-soft">{t("itineraryHint")}</p>
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-white/60 p-3">
            <input className={input} placeholder={t("eventName")} value={r.name} maxLength={80} onChange={(e) => patchRow(i, { name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" aria-label={t("date")} className={input} value={r.date} onChange={(e) => patchRow(i, { date: e.target.value })} />
              <input type="time" aria-label={t("time")} className={input} value={r.time} onChange={(e) => patchRow(i, { time: e.target.value })} />
            </div>
            <input className={input} placeholder={t("eventVenue")} value={r.venue} maxLength={120} onChange={(e) => patchRow(i, { venue: e.target.value })} />
            <input className={input} placeholder={t("eventNote")} value={r.note} maxLength={160} onChange={(e) => patchRow(i, { note: e.target.value })} />
            <button type="button" className="self-start text-base text-red-800 underline" onClick={() => setItinerary(rows.filter((_, n) => n !== i))}>{t("remove")}</button>
          </div>
        ))}
        {rows.length < 8 && <button type="button" className={`${small} self-start`} onClick={() => setRows([...rows, { name: "", date: "", time: "", venue: "", note: "" }])}>{t("addEvent")}</button>}
      </section>

      <section className={box}>
        <h3 className={h}>{t("story")}</h3>
        <p className="text-base text-ink-soft">{t("storyHint")}</p>
        {value.story.map((s, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-white/60 p-3">
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <input className={input} placeholder={t("storyTitle")} value={s.title} maxLength={80} onChange={(e) => patchStory(i, { title: e.target.value })} />
              <input className={input} placeholder={t("storyWhen")} value={s.when ?? ""} maxLength={40} onChange={(e) => patchStory(i, { when: e.target.value })} />
            </div>
            <textarea rows={2} className={input} placeholder={t("storyText")} value={s.text ?? ""} maxLength={400} onChange={(e) => patchStory(i, { text: e.target.value })} />
            <div className="flex flex-wrap gap-3">
              <button type="button" className="text-base text-red-800 underline" onClick={() => setStory(value.story.filter((_, n) => n !== i))}>{t("remove")}</button>
            </div>
          </div>
        ))}
        {value.story.length < 8 && <button type="button" className={`${small} self-start`} onClick={() => setStory([...value.story, { title: "" }])}>{t("addStory")}</button>}
      </section>

      <section className={box}>
        <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="h-6 w-6" checked={value.countdown} onChange={(e) => onChange({ ...value, countdown: e.target.checked })} />{t("countdown")}</label>
        <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="h-6 w-6" checked={value.music} onChange={(e) => onChange({ ...value, music: e.target.checked })} />{t("music")}</label>
      </section>
    </div>
  );
}
