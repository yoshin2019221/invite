import type { ThemeColors } from "@/lib/themes";

// Invite templates. "classic" is the original single-card page; the rest use the scrolling renderer.
export const TEMPLATES = [
  "classic",
  "royal",
  "bloom",
  "griha",
  "pooja",
  "confetti",
  "blossom",
  "night",
] as const;
export type TemplateId = (typeof TEMPLATES)[number];
export const DEFAULT_TEMPLATE: TemplateId = "classic";

export type TemplateDef = {
  id: TemplateId;
  rich: boolean;
  occasions: string[]; // occasions it is recommended for (all if empty)
  colors: ThemeColors;
  lottie?: string;
  music?: string;
  display: string; // CSS font-family var for headings
  body: string;
  script?: string;
  dark?: boolean;
};

const c = (
  paper: string, paperDeep: string, ink: string, inkSoft: string,
  accent: string, accentDeep: string, highlight: string,
): ThemeColors => ({ paper, paperDeep, ink, inkSoft, accent, accentDeep, highlight });

export const TEMPLATE_DEFS: Record<TemplateId, TemplateDef> = {
  classic: {
    id: "classic", rich: false, occasions: [],
    colors: c("#fbf3e4", "#f3e4c8", "#3a1d12", "#6b4a3a", "#7a1f2b", "#5c141f", "#c97a10"),
    display: "var(--font-display)", body: "var(--font-body)",
  },
  royal: {
    id: "royal", rich: true, occasions: ["wedding"],
    colors: c("#1b0f14", "#2a1620", "#f6ead2", "#d8c4a0", "#e3c27a", "#b8913f", "#e3c27a"),
    lottie: "gold-sparkles", music: "ambient-royal",
    display: "var(--font-cinzel)", body: "var(--font-cormorant)", script: "var(--font-script)", dark: true,
  },
  bloom: {
    id: "bloom", rich: true, occasions: ["wedding", "baby"],
    colors: c("#fdf3f0", "#f8e1dc", "#4a2a30", "#85595f", "#b4505e", "#8c3844", "#c08a4a"),
    lottie: "rose-petals", music: "ambient-soft",
    display: "var(--font-playfair)", body: "var(--font-jost)", script: "var(--font-script)",
  },
  griha: {
    id: "griha", rich: true, occasions: ["housewarming"],
    colors: c("#fbf1de", "#f2deb8", "#3a2410", "#6e4d2e", "#b45309", "#8a3d05", "#2f6b3a"),
    lottie: "marigold-petals", music: "ambient-sitar",
    display: "var(--font-playfair)", body: "var(--font-jost)", script: "var(--font-script)",
  },
  pooja: {
    id: "pooja", rich: true, occasions: ["pooja"],
    colors: c("#2a0f08", "#3d1a0e", "#fbe9c8", "#e5c791", "#f59e0b", "#c77a06", "#ffd27a"),
    lottie: "warm-embers", music: "ambient-sitar",
    display: "var(--font-yatra)", body: "var(--font-jost)", dark: true,
  },
  confetti: {
    id: "confetti", rich: true, occasions: ["birthday", "party"],
    colors: c("#fff8e7", "#ffe9b8", "#1d1b3a", "#4a4775", "#e11d63", "#b0124a", "#2547d0"),
    lottie: "confetti", music: "ambient-playful",
    display: "var(--font-fredoka)", body: "var(--font-jost)",
  },
  blossom: {
    id: "blossom", rich: true, occasions: ["baby", "birthday"],
    colors: c("#f2f7fb", "#dfeaf3", "#26384a", "#566d82", "#4b7fa6", "#2f5f86", "#d98a6c"),
    lottie: "soft-bubbles", music: "ambient-soft",
    display: "var(--font-playfair)", body: "var(--font-jost)", script: "var(--font-script)",
  },
  night: {
    id: "night", rich: true, occasions: ["party", "birthday", "wedding"],
    colors: c("#120a1e", "#1e1230", "#f5ecff", "#c9b8e2", "#ff7ab8", "#d4478f", "#e6c27a"),
    lottie: "party-glitter", music: "ambient-playful",
    display: "var(--font-cinzel)", body: "var(--font-jost)", dark: true,
  },
};

export function isTemplate(v: string | null | undefined): v is TemplateId {
  return !!v && (TEMPLATES as readonly string[]).includes(v);
}
export function templateOf(v: string | null | undefined): TemplateDef {
  return TEMPLATE_DEFS[isTemplate(v) ? v : DEFAULT_TEMPLATE];
}
export function templatesFor(occasion: string): TemplateId[] {
  const rich = TEMPLATES.filter((t) => TEMPLATE_DEFS[t].rich);
  const first = rich.filter((t) => TEMPLATE_DEFS[t].occasions.includes(occasion));
  return ["classic", ...first, ...rich.filter((t) => !first.includes(t))];
}
