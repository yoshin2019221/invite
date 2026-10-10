// Invitation themes. The same colours drive the guest page (via data-theme CSS in
// globals.css) and the WhatsApp preview card (via these values), so they must stay in sync.

export const THEMES = ["haldi", "mehendi", "neel", "gulab"] as const;
export type ThemeId = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeId = "haldi";

export type ThemeColors = {
  paper: string;
  paperDeep: string;
  ink: string;
  inkSoft: string;
  accent: string; // titles, borders, buttons
  accentDeep: string;
  highlight: string; // small labels, divider
};

export const THEME_COLORS: Record<ThemeId, ThemeColors> = {
  haldi: {
    paper: "#fbf3e4",
    paperDeep: "#f3e4c8",
    ink: "#3a1d12",
    inkSoft: "#6b4a3a",
    accent: "#7a1f2b",
    accentDeep: "#5c141f",
    highlight: "#c97a10",
  },
  mehendi: {
    paper: "#f3f6e8",
    paperDeep: "#e2e9c9",
    ink: "#1f2e1a",
    inkSoft: "#46593f",
    accent: "#2f5d34",
    accentDeep: "#1f4224",
    highlight: "#a2740a",
  },
  neel: {
    paper: "#eff2f9",
    paperDeep: "#dce3f2",
    ink: "#1a2038",
    inkSoft: "#454f7a",
    accent: "#27337a",
    accentDeep: "#1a2358",
    highlight: "#a47a1d",
  },
  gulab: {
    paper: "#fdf1f3",
    paperDeep: "#f8dde2",
    ink: "#3d1a26",
    inkSoft: "#744859",
    accent: "#a3294f",
    accentDeep: "#7d1b3b",
    highlight: "#bd6119",
  },
};

export function isTheme(value: string | null | undefined): value is ThemeId {
  return !!value && (THEMES as readonly string[]).includes(value);
}

export function themeOf(value: string | null | undefined): ThemeId {
  return isTheme(value) ? value : DEFAULT_THEME;
}

// Sensible starting theme for each occasion (the host can change it).
export const OCCASION_THEME: Record<string, ThemeId> = {
  birthday: "neel",
  housewarming: "haldi",
  pooja: "haldi",
  baby: "gulab",
  party: "mehendi",
  wedding: "gulab",
};
