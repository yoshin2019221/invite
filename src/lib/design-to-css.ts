/**
 * Extracts visual styling from a design prompt to create matching CSS custom properties
 * for the HTML web invite, so it looks cohesive with the AI-generated card.
 *
 * This is a keyword-based approach — it parses the design prompt for colour mentions,
 * textures, and mood, then maps them to CSS overrides for the invite page.
 */

type DesignCSS = {
  /** CSS custom properties to override the template defaults */
  vars: Record<string, string>;
  /** Extra CSS class names for the invite wrapper */
  classes: string[];
  /** An optional background CSS value (gradient, image etc.) */
  backgroundCSS?: string;
};

// Common colour keywords found in Indian invitation design prompts → hex values
const COLOR_MAP: Record<string, string> = {
  // Reds & maroons
  maroon: "#800020",
  crimson: "#DC143C",
  "deep red": "#8B0000",
  vermillion: "#E34234",
  sindoor: "#E34234",
  // Pinks
  "blush pink": "#F8C8DC",
  "rose pink": "#E8A0B4",
  "magenta": "#C8008C",
  "fuchsia": "#FF00FF",
  // Golds
  gold: "#D4A843",
  "antique gold": "#C8A951",
  "golden": "#D4A843",
  "brass": "#B5A642",
  // Saffrons & oranges
  saffron: "#F4C430",
  "turmeric": "#E8B830",
  "tangerine": "#FF9966",
  orange: "#F08000",
  // Greens
  emerald: "#006B3C",
  "sage green": "#9CAF88",
  "forest green": "#228B22",
  "olive": "#808000",
  "mint": "#98FF98",
  teal: "#008080",
  "peacock": "#006B6B",
  // Blues
  "royal blue": "#002366",
  navy: "#001F3F",
  "sapphire": "#0F52BA",
  "midnight blue": "#191970",
  "powder blue": "#B0D4F1",
  "sky blue": "#87CEEB",
  // Purples
  purple: "#6A0DAD",
  "deep purple": "#4A0E4E",
  lavender: "#C4A5D1",
  "plum": "#8E4585",
  "wine": "#722F37",
  // Neutrals & earth
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  "off-white": "#FAF9F6",
  "pearl": "#F0EAD6",
  "champagne": "#F7E7CE",
  beige: "#F5F0E1",
  "sandstone": "#C2B280",
  "terracotta": "#C66B3D",
  "rust": "#B7410E",
  "copper": "#B87333",
  "bronze": "#CD7F32",
  // Darks
  charcoal: "#36454F",
  "deep black": "#0A0A0A",
  black: "#111111",
  "midnight": "#191970",
};

// Background texture/pattern keywords → CSS
const TEXTURE_MAP: Record<string, string> = {
  "silk": "linear-gradient(135deg, rgba(255,255,255,0.06) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.06) 75%, transparent 75%)",
  "marble": "radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)",
  "velvet": "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)",
  "paper": "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\")",
  "gold foil": "linear-gradient(135deg, rgba(212,168,67,0.08) 0%, rgba(255,215,0,0.04) 50%, rgba(212,168,67,0.08) 100%)",
  "watercolour": "radial-gradient(circle at 30% 20%, rgba(255,200,200,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(200,200,255,0.08) 0%, transparent 50%)",
  "watercolor": "radial-gradient(circle at 30% 20%, rgba(255,200,200,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(200,200,255,0.08) 0%, transparent 50%)",
};

function findColors(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  // Sort by length descending so "deep red" matches before "red"
  const keys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) {
      found.push(COLOR_MAP[key]);
      if (found.length >= 5) break;
    }
  }
  // Also try to find hex codes directly in the prompt
  const hexMatches = text.match(/#[0-9a-fA-F]{6}/g);
  if (hexMatches) {
    for (const h of hexMatches) {
      if (!found.includes(h)) found.push(h);
      if (found.length >= 5) break;
    }
  }
  return found;
}

function findTexture(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(TEXTURE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function designPromptToCSS(designPrompt: string | undefined): DesignCSS | null {
  if (!designPrompt || designPrompt.length < 10) return null;

  const colors = findColors(designPrompt);
  if (colors.length === 0) return null;

  const texture = findTexture(designPrompt);
  const lower = designPrompt.toLowerCase();

  // Assign roles to the found colors
  const accent = colors[0]; // primary accent
  const secondary = colors[1] ?? lighten(accent, 0.3); // secondary/highlight
  const tertiary = colors[2]; // optional third color

  // Decide if the design wants a dark or light page
  const wantsDark = lower.includes("dark background") || lower.includes("deep black") ||
    lower.includes("midnight") || lower.includes("dark ") || lower.includes("noir") ||
    lower.includes("night sky") || lower.includes("dark moody") || lower.includes("neon");

  const vars: Record<string, string> = {};
  const classes: string[] = ["design-styled"];

  if (wantsDark) {
    // Dark theme: dark paper, light text
    const bg = tertiary && isDark(tertiary) ? tertiary : "#1a1a2e";
    vars["--paper"] = bg;
    vars["--paper-deep"] = darken(bg, 0.3);
    vars["--ink"] = "#f0ece4";
    vars["--ink-soft"] = "rgba(240,236,228,0.7)";
    vars["--maroon"] = isDark(accent) ? lighten(accent, 0.4) : accent;
    vars["--maroon-deep"] = isDark(accent) ? lighten(accent, 0.2) : darken(accent, 0.2);
    vars["--saffron"] = secondary;
    classes.push("design-dark");
  } else {
    // Light theme: light paper derived from accent tints
    const paperBase = lighten(accent, 0.92);
    vars["--paper"] = paperBase;
    vars["--paper-deep"] = lighten(accent, 0.85);
    vars["--ink"] = darken(accent, 0.7);
    vars["--ink-soft"] = withAlpha(darken(accent, 0.5), 0.65);
    vars["--maroon"] = isDark(accent) ? accent : darken(accent, 0.3);
    vars["--maroon-deep"] = darken(accent, 0.4);
    vars["--saffron"] = secondary;
  }

  // Build a background CSS
  let backgroundCSS: string | undefined;
  if (texture) {
    backgroundCSS = `${texture}, var(--paper)`;
  }

  // Detect ornate/border mentions for styling hints
  if (lower.includes("ornate") || lower.includes("border") || lower.includes("frame")) {
    classes.push("design-ornate");
  }
  if (lower.includes("floral") || lower.includes("flower") || lower.includes("lotus") || lower.includes("rose")) {
    classes.push("design-floral");
  }
  if (lower.includes("minimal") || lower.includes("clean") || lower.includes("modern")) {
    classes.push("design-minimal");
  }

  return { vars, classes, backgroundCSS };
}
