"use client";

import { useLocale, useTranslations } from "next-intl";
import { TEMPLATE_DEFS, templatesFor, type TemplateId } from "@/lib/templates";

// Gallery of looks. Each card shows a live, scaled-down preview of the real template.
export default function TemplatePicker({ occasion, value, onChange }: {
  occasion: string;
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  const t = useTranslations("Templates");
  const locale = useLocale();
  const ids = templatesFor(occasion);

  return (
    <div role="radiogroup" aria-label={t("heading")} className="grid grid-cols-2 gap-4">
      {ids.map((id) => {
        const def = TEMPLATE_DEFS[id];
        const on = value === id;
        return (
          <div key={id} className={`flex flex-col gap-2 rounded-2xl border-4 p-2 ${on ? "border-maroon bg-maroon/10" : "border-transparent bg-white/50"}`}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(id)}
              className="relative block aspect-[9/16] w-full overflow-hidden rounded-xl border border-black/10 text-left active:scale-[.98]"
              style={{ backgroundColor: def.colors.paper }}
            >
              {def.rich ? (
                <iframe
                  src={`/${locale}/preview/${id}`}
                  title={t(id)}
                  loading="lazy"
                  tabIndex={-1}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 h-[177.8%] w-[200%] origin-top-left scale-50 border-0"
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center" style={{ color: def.colors.accent }}>
                  <span className="font-display text-2xl">{t("classicSample")}</span>
                  <span className="h-1 w-12" style={{ backgroundColor: def.colors.highlight }} />
                  <span className="text-sm" style={{ color: def.colors.inkSoft }}>{t("classicNote")}</span>
                </span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-lg font-semibold text-maroon">{t(id)}</span>
              {def.rich && (
                <a href={`/${locale}/preview/${id}`} target="_blank" rel="noreferrer" className="text-sm text-ink-soft underline">
                  {t("fullPreview")}
                </a>
              )}
            </div>
            {on && <span className="px-1 text-sm font-medium text-maroon">{t("selected")}</span>}
          </div>
        );
      })}
    </div>
  );
}
