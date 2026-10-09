import localFont from "next/font/local";

export const display = localFont({
  src: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  variable: "--nf-display",
  weight: "100 900",
  display: "swap",
});

export const hindiDisplay = localFont({
  src: "../../node_modules/@fontsource/tiro-devanagari-hindi/files/tiro-devanagari-hindi-devanagari-400-normal.woff2",
  variable: "--nf-display-hi",
  weight: "400",
  display: "swap",
});

export const bodyLatin = localFont({
  src: [
    { path: "../../node_modules/@fontsource/hind/files/hind-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/hind/files/hind-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/hind/files/hind-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--nf-body",
  display: "swap",
});

export const bodyDevanagari = localFont({
  src: [
    { path: "../../node_modules/@fontsource/hind/files/hind-devanagari-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/hind/files/hind-devanagari-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/hind/files/hind-devanagari-600-normal.woff2", weight: "600" },
  ],
  variable: "--nf-body-hi",
  display: "swap",
});
