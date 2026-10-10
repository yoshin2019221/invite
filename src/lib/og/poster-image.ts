import "server-only";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { templateOf } from "@/lib/templates";
import { THEME_COLORS, themeOf } from "@/lib/themes";

// A tall (or square) shareable picture of the invite: WhatsApp status, chat, or A5 print.
// Drawn with sharp's Pango text engine so Hindi shapes correctly.

export type PosterFormat = "story" | "square" | "print";
export const POSTER_SIZES: Record<PosterFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
  print: { w: 1748, h: 2480 }, // A5 portrait at 300 dpi
};

export type PosterInput = {
  format: PosterFormat;
  occasionLabel: string;
  title: string;
  hostLine: string;
  day: string;
  monthYear: string;
  weekdayTime: string;
  whereLine?: string | null;
  photo?: Buffer | null;
  brand: string;
  theme?: string | null;
  template?: string | null;
};

const FONT = {
  fraunces: fileURLToPath(new URL("./fonts/Fraunces_700Bold.ttf", import.meta.url)),
  hind: fileURLToPath(new URL("./fonts/Hind_400Regular.ttf", import.meta.url)),
  hindMedium: fileURLToPath(new URL("./fonts/Hind_500Medium.ttf", import.meta.url)),
  tiro: fileURLToPath(new URL("./fonts/TiroDevanagariHindi_400Regular.ttf", import.meta.url)),
};
const deva = (s: string) => /[ऀ-ॿ]/.test(s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Block = { input: Buffer; width: number; height: number };

async function text(t: string, font: string, fontfile: string, color: string, width: number, tracking?: number): Promise<Block> {
  const sp = tracking ? ` letter_spacing="${tracking}"` : "";
  const { data, info } = await sharp({
    text: { text: `<span foreground="${color}"${sp}>${esc(t)}</span>`, font, fontfile, width, wrap: "word", align: "centre", rgba: true },
  }).png().toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

export async function renderPosterJpeg(i: PosterInput) {
  const { w: W, h: H } = POSTER_SIZES[i.format];
  const s = W / 1080;
  const tpl = templateOf(i.template);
  const c = tpl.rich ? tpl.colors : THEME_COLORS[themeOf(i.theme)];
  const inset = Math.round(44 * s);
  const innerX = inset + Math.round(28 * s);
  const innerW = W - innerX * 2;
  const gap = Math.round((i.format === "square" ? 14 : 40) * s);
  const compact = i.format === "square";
  const m = compact ? 1 : 1.2; // tall formats have room for bigger type

  const layers: OverlayOptions[] = [];
  let y = innerX;

  if (i.photo) {
    const ph = Math.round(H * (compact ? 0.27 : 0.3));
    const buf = await sharp(i.photo).rotate().resize(innerW, ph, { fit: "cover" }).png().toBuffer().catch(() => null);
    if (buf) {
      const mask = Buffer.from(`<svg width="${innerW}" height="${ph}"><rect width="${innerW}" height="${ph}" rx="${Math.round(28 * s)}" fill="#fff"/></svg>`);
      const rounded = await sharp(buf).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
      layers.push({ input: rounded, left: innerX, top: y });
      y += ph + gap;
    }
  }
  const photoBottom = y;

  const hi = deva(i.title) || deva(i.occasionLabel);
  const label = await text(hi ? i.occasionLabel : i.occasionLabel.toUpperCase(), `Hind Medium ${Math.round(34 * s)}`, FONT.hindMedium, c.highlight, innerW, hi ? undefined : 4000);

  const titleMax = H * (compact ? (i.photo ? 0.17 : 0.28) : 0.2);
  let title: Block | undefined;
  for (const px of [128, 112, 98, 84, 72, 62, 54, 46, 40]) {
    title = await text(i.title, `${deva(i.title) ? "Tiro Devanagari Hindi" : "Fraunces Bold"} ${Math.round(px * s * (compact ? 1 : 1.1))}`, deva(i.title) ? FONT.tiro : FONT.fraunces, c.accent, innerW);
    if (title.height <= titleMax) break;
  }
  const host = await text(i.hostLine, `Hind ${Math.round(38 * s * m)}`, FONT.hind, c.inkSoft, innerW);
  const day = await text(i.day, `Fraunces Bold ${Math.round((compact ? 96 : 190) * s)}`, FONT.fraunces, c.highlight, innerW);
  const my = await text(i.monthYear, `${deva(i.monthYear) ? "Tiro Devanagari Hindi" : "Fraunces Bold"} ${Math.round(46 * s * m)}`, deva(i.monthYear) ? FONT.tiro : FONT.fraunces, c.ink, innerW);
  const wt = await text(i.weekdayTime, `Hind Medium ${Math.round(40 * s * m)}`, FONT.hindMedium, c.ink, innerW);
  const where = i.whereLine ? await text(i.whereLine, `Hind ${Math.round(36 * s * m)}`, FONT.hind, c.inkSoft, innerW) : null;
  const brand = await text(i.brand, `Fraunces Bold ${Math.round(34 * s)}`, FONT.fraunces, c.accent, innerW);

  const stack: Block[] = [label, title as Block, host, day, my, wt, ...(where ? [where] : [])];
  const dividerH = Math.round(6 * s);
  const brandSpace = brand.height + Math.round(26 * s);
  const total = stack.reduce((a, b) => a + b.height, 0) + gap * (stack.length - 1) + dividerH + gap;
  const avail = H - innerX - brandSpace - photoBottom;
  y = photoBottom + Math.max(0, Math.round((avail - total) / 2));

  const place = (b: Block) => { layers.push({ input: b.input, left: Math.round((W - b.width) / 2), top: Math.round(y) }); y += b.height + gap; };
  place(label);
  place(title as Block);
  place(host);
  layers.push({ input: Buffer.from(`<svg width="${Math.round(140 * s)}" height="${dividerH}"><rect width="${Math.round(140 * s)}" height="${dividerH}" rx="${dividerH / 2}" fill="${c.highlight}"/></svg>`), left: Math.round((W - 140 * s) / 2), top: Math.round(y) });
  y += dividerH + gap;
  place(day); y -= gap * 0.6; place(my); y -= gap * 0.4; place(wt);
  if (where) place(where);
  layers.push({ input: brand.input, left: Math.round((W - brand.width) / 2), top: H - innerX - brand.height });

  const border = Buffer.from(
    `<svg width="${W}" height="${H}"><rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" rx="${Math.round(26 * s)}" fill="none" stroke="${c.accent}" stroke-width="${Math.max(3, Math.round(4 * s))}"/><rect x="${inset + 14 * s}" y="${inset + 14 * s}" width="${W - inset * 2 - 28 * s}" height="${H - inset * 2 - 28 * s}" rx="${Math.round(18 * s)}" fill="none" stroke="${c.highlight}" stroke-opacity=".55" stroke-width="${Math.max(2, Math.round(2 * s))}"/></svg>`,
  );
  layers.push({ input: border, left: 0, top: 0 });

  return sharp({ create: { width: W, height: H, channels: 3, background: c.paper } })
    .composite(layers)
    .jpeg({ quality: i.format === "print" ? 92 : 86, mozjpeg: true })
    .toBuffer();
}
