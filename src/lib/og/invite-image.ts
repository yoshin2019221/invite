import "server-only";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { THEME_COLORS, themeOf } from "@/lib/themes";

// The invite card is drawn with sharp's text engine (Pango + HarfBuzz) rather than an
// HTML-to-image library, because only a real text shaper renders Hindi (Devanagari) correctly.

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export type InviteImageInput = {
  occasionLabel: string;
  title: string;
  hostLine: string;
  whenLine: string;
  whereLine?: string | null;
  photo?: Buffer | null;
  brand: string;
  theme?: string | null;
};

const FONT = {
  frauncesBold: fileURLToPath(new URL("./fonts/Fraunces_700Bold.ttf", import.meta.url)),
  hind: fileURLToPath(new URL("./fonts/Hind_400Regular.ttf", import.meta.url)),
  hindMedium: fileURLToPath(new URL("./fonts/Hind_500Medium.ttf", import.meta.url)),
  tiro: fileURLToPath(new URL("./fonts/TiroDevanagariHindi_400Regular.ttf", import.meta.url)),
};

const PAD = 28;
const IW = OG_WIDTH - PAD * 2;
const IH = OG_HEIGHT - PAD * 2;
const PHOTO_W = 430;

const hasDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);
const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Block = { input: Buffer; width: number; height: number };

async function textBlock(opts: {
  text: string;
  font: string;
  fontfile: string;
  color: string;
  width: number;
  tracking?: number;
}): Promise<Block> {
  const spacing = opts.tracking ? ` letter_spacing="${opts.tracking}"` : "";
  const markup = `<span foreground="${opts.color}"${spacing}>${escapeXml(opts.text)}</span>`;
  const { data, info } = await sharp({
    text: {
      text: markup,
      font: opts.font,
      fontfile: opts.fontfile,
      width: opts.width,
      wrap: "word",
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

async function fitTitle(title: string, width: number, maxHeight: number, color: string) {
  const deva = hasDevanagari(title);
  const font = deva ? "Tiro Devanagari Hindi" : "Fraunces Bold";
  const fontfile = deva ? FONT.tiro : FONT.frauncesBold;
  let block: Block | undefined;
  for (const size of [80, 66, 56, 48, 42, 36, 32]) {
    block = await textBlock({ text: title, font: `${font} ${size}`, fontfile, color, width });
    if (block.height <= maxHeight) break;
  }
  return block as Block;
}

export async function renderInviteJpeg(input: InviteImageInput) {
  const c = THEME_COLORS[themeOf(input.theme)];
  const MAROON = c.accent;
  const INK = c.ink;
  const INK_SOFT = c.inkSoft;
  const SAFFRON = c.highlight;
  const PAPER = c.paper;
  const photo = input.photo
    ? await sharp(input.photo)
        .rotate()
        .resize(PHOTO_W, IH, { fit: "cover" })
        .png()
        .toBuffer()
        .catch(() => null)
    : null;

  const padX = photo ? PHOTO_W + 52 : 64;
  const textW = IW - padX - 52;
  const title = input.title.length > 110 ? `${input.title.slice(0, 108)}…` : input.title;
  const label = hasDevanagari(input.occasionLabel)
    ? input.occasionLabel
    : input.occasionLabel.toUpperCase();

  const brand = await textBlock({
    text: input.brand,
    font: "Fraunces Bold 26",
    fontfile: FONT.frauncesBold,
    color: MAROON,
    width: 260,
  });
  const labelBlock = await textBlock({
    text: label,
    font: "Hind Medium 30",
    fontfile: FONT.hindMedium,
    color: SAFFRON,
    width: textW - brand.width - 24,
    tracking: hasDevanagari(label) ? undefined : 2500,
  });
  const titleBlock = await fitTitle(title, textW, 250, MAROON);
  const hostBlock = await textBlock({
    text: input.hostLine,
    font: "Hind 32",
    fontfile: FONT.hind,
    color: INK_SOFT,
    width: textW,
  });
  const whenBlock = await textBlock({
    text: input.whenLine,
    font: "Hind Medium 34",
    fontfile: FONT.hindMedium,
    color: INK,
    width: textW,
  });
  const whereBlock = input.whereLine
    ? await textBlock({
        text: input.whereLine,
        font: "Hind 30",
        fontfile: FONT.hind,
        color: INK_SOFT,
        width: textW,
      })
    : null;

  const bottom = IH - 34;
  const whereY = whereBlock ? bottom - whereBlock.height : bottom;
  const whenY = whereY - (whereBlock ? 6 : 0) - whenBlock.height;
  const dividerY = whenY - 22;

  const titleY = 44 + labelBlock.height + 22;
  const hostY = titleY + titleBlock.height + 22;

  const layers: OverlayOptions[] = [];
  if (photo) layers.push({ input: photo, left: 0, top: 0 });
  layers.push(
    { input: labelBlock.input, left: padX, top: 44 },
    { input: brand.input, left: IW - 52 - brand.width, top: 40 },
    { input: titleBlock.input, left: padX, top: titleY },
    { input: hostBlock.input, left: padX, top: hostY },
    {
      input: Buffer.from(
        `<svg width="120" height="4"><rect width="120" height="3" fill="${SAFFRON}"/></svg>`,
      ),
      left: padX,
      top: dividerY,
    },
    { input: whenBlock.input, left: padX, top: whenY },
  );
  if (whereBlock) layers.push({ input: whereBlock.input, left: padX, top: whereY });

  const content = await sharp({
    create: { width: IW, height: IH, channels: 4, background: PAPER },
  })
    .composite(layers)
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${IW}" height="${IH}"><rect width="${IW}" height="${IH}" rx="16" fill="#fff"/></svg>`,
  );
  const clipped = await sharp(content)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const border = Buffer.from(
    `<svg width="${OG_WIDTH}" height="${OG_HEIGHT}"><rect x="${PAD + 1.5}" y="${PAD + 1.5}" width="${IW - 3}" height="${IH - 3}" rx="17" fill="none" stroke="${MAROON}" stroke-width="3"/></svg>`,
  );

  return sharp({
    create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: PAPER },
  })
    .composite([
      { input: clipped, left: PAD, top: PAD },
      { input: border, left: 0, top: 0 },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}
