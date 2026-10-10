"use client";

import { useEffect, useState } from "react";

export default function Countdown({ target, labels, done }: {
  target: string;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  done: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = now === null ? null : new Date(target).getTime() - now;
  if (diff !== null && diff <= 0) return <p className="count-done">{done}</p>;
  const s = Math.max(0, Math.floor((diff ?? 0) / 1000));
  const cells: [number | null, string][] = [
    [diff === null ? null : Math.floor(s / 86400), labels.days],
    [diff === null ? null : Math.floor((s % 86400) / 3600), labels.hours],
    [diff === null ? null : Math.floor((s % 3600) / 60), labels.minutes],
    [diff === null ? null : s % 60, labels.seconds],
  ];
  return (
    <div className="count-grid" role="timer" aria-label={cells.map(([n, l]) => `${n ?? ""} ${l}`).join(" ")}>
      {cells.map(([n, l]) => (
        <div key={l} className="count-cell">
          <span className="count-num">{n === null ? "–" : String(n).padStart(2, "0")}</span>
          <span className="count-label">{l}</span>
        </div>
      ))}
    </div>
  );
}
