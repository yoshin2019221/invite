"use client";

import { useEffect, useRef, useState } from "react";

// Music never starts by itself: the guest taps to play (browsers block autoplay anyway).
export default function MusicButton({ src, playLabel, pauseLabel }: { src: string; playLabel: string; pauseLabel: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => () => { audio.current?.pause(); }, []);

  async function toggle() {
    if (!audio.current) {
      audio.current = new Audio(src);
      audio.current.loop = true;
      audio.current.volume = 0.5;
    }
    if (on) { audio.current.pause(); setOn(false); return; }
    try { await audio.current.play(); setOn(true); } catch { setOn(false); }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? pauseLabel : playLabel}
      className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-maroon/50 bg-paper/90 text-maroon shadow-lg backdrop-blur active:scale-95"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {on ? (<><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>) : (<><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>)}
      </svg>
    </button>
  );
}
