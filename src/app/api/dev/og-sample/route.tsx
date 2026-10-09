import { NextResponse } from "next/server";
import sharp from "sharp";
import { renderInviteJpeg } from "@/lib/og/invite-image";

// Development-only: preview the invite card without a database.
// Try /api/dev/og-sample?locale=hi&photo=1
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const q = new URL(request.url).searchParams;
  const hi = q.get("locale") === "hi";
  const theme = q.get("theme");

  let photo: Buffer | null = null;
  if (q.get("photo") === "1") {
    photo = await sharp({
      create: { width: 860, height: 1144, channels: 3, background: "#d9a05b" },
    })
      .jpeg()
      .toBuffer();
  }

  const jpeg = await renderInviteJpeg(
    hi
      ? {
          occasionLabel: "गृह प्रवेश",
          title: q.get("title") ?? "शर्मा परिवार का गृह प्रवेश संस्कार",
          hostLine: "मेज़बान: शर्मा परिवार",
          whenLine: "शनिवार, 14 नवंबर 2026, शाम 6:30",
          whereLine: "सुंदर विला, सेक्टर 21, गुरुग्राम",
          photo,
          brand: "GharInvite",
          theme,
        }
      : {
          occasionLabel: "HOUSEWARMING",
          title: q.get("title") ?? "Griha Pravesh of the Sharma Family",
          hostLine: "Hosted by The Sharma family",
          whenLine: "Saturday, 14 November 2026, 6:30 pm",
          whereLine: "Sundar Villa, Sector 21, Gurugram",
          photo,
          brand: "GharInvite",
          theme,
        },
  );

  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}
