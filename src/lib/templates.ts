import type { ThemeColors } from "@/lib/themes";

// There are no named templates any more. Every invite uses one clean base look, and the host's
// description (turned into CSS by the AI) is what makes it unique. The "template" column is kept
// for old invites: whatever value they hold, they render with this base look.
export const TEMPLATES = ["default"] as const;
export type TemplateId = (typeof TEMPLATES)[number];
export const DEFAULT_TEMPLATE: TemplateId = "default";

export type TemplateDef = {
  id: TemplateId;
  rich: boolean;
  colors: ThemeColors;
  lottie?: string;
  music?: string;
  dark?: boolean;
};

export const TEMPLATE_DEFS: Record<TemplateId, TemplateDef> = {
  default: {
    id: "default",
    rich: true,
    colors: {
      paper: "#fbf3e4", paperDeep: "#f3e4c8", ink: "#3a1d12", inkSoft: "#6b4a3a",
      accent: "#7a1f2b", accentDeep: "#5c141f", highlight: "#c97a10",
    },
    lottie: "marigold-petals",
  },
};

export function isTemplate(v: string | null | undefined): v is TemplateId {
  return v === "default";
}
export function templateOf(v?: string | null): TemplateDef {
  void v; // every value, old or new, renders with the base look
  return TEMPLATE_DEFS.default;
}
