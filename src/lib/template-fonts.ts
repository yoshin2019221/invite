import localFont from "next/font/local";

// Fonts for the rich templates. Imported only by the rich invite route, so the classic pages don't pay for them.
export const cinzel = localFont({
  src: [
    { path: "../../node_modules/@fontsource/cinzel/files/cinzel-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/cinzel/files/cinzel-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-cinzel", display: "swap", adjustFontFallback: false,
});
export const cormorant = localFont({
  src: [
    { path: "../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-cormorant", display: "swap", adjustFontFallback: false,
});
export const script = localFont({
  src: "../../node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2",
  variable: "--font-script", weight: "400", display: "swap", adjustFontFallback: false,
});
export const jost = localFont({
  src: [
    { path: "../../node_modules/@fontsource/jost/files/jost-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/jost/files/jost-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/jost/files/jost-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-jost", display: "swap", adjustFontFallback: false,
});
export const playfair = localFont({
  src: [
    { path: "../../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../../node_modules/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-playfair", display: "swap", adjustFontFallback: false,
});
export const fredoka = localFont({
  src: [
    { path: "../../node_modules/@fontsource/fredoka/files/fredoka-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-fredoka", display: "swap", adjustFontFallback: false,
});
export const yatra = localFont({
  src: "../../node_modules/@fontsource/yatra-one/files/yatra-one-latin-400-normal.woff2",
  variable: "--font-yatra", weight: "400", display: "swap", adjustFontFallback: false,
});

export const templateFontClass = [cinzel, cormorant, script, jost, playfair, fredoka, yatra]
  .map((x) => x.variable)
  .join(" ");
