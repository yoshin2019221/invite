"use client";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-maroon px-8 py-4 text-xl font-semibold text-paper active:scale-95"
    >
      {label}
    </button>
  );
}
