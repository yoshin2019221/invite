import { NextResponse } from "next/server";
import sharp from "sharp";
import { renderPosterJpeg, type PosterFormat } from "@/lib/og/poster-image";

// Development-only: preview the downloadable poster without a database.
// Try /api/dev/poster-sample?format=story&template=royal&locale=hi&photo=1
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = new URL(request.url).searchParams;
  const hi = q.get("locale") === "hi";
  const photo = q.get("photo") === "1"
    ? await sharp({ create: { width: 900, height: 700, channels: 3, background: "#c98a5a" } }).jpeg().toBuffer()
    : null;
  const jpeg = await renderPosterJpeg({
    format: (q.get("format") as PosterFormat) ?? "story",
    occasionLabel: hi ? "शादी" : "Wedding",
    title: hi ? "आरव और मीरा की शादी" : "Aarav & Meera's wedding",
    hostLine: hi ? "स्नेह सहित, शर्मा और कपूर परिवार" : "With love, The Sharma and Kapoor families",
    day: "19",
    monthYear: hi ? "नवंबर 2026" : "November 2026",
    weekdayTime: hi ? "गुरुवार, शाम 6:30 बजे" : "Thursday, 6:30 pm",
    whereLine: "The Grand, 12 Civil Lines, Jaipur",
    photo,
    brand: "weInvite",
    template: q.get("template"),
  });
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
}
