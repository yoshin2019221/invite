/**
 * Makes AI-generated CSS safe to inject into an invite page:
 *  - strips anything that could run script or fetch outside resources,
 *  - scopes every rule to the invite (.design-ai) so it cannot restyle the rest of the site,
 *  - keeps @keyframes and @media so designs can animate and stay responsive.
 */
const SCOPE = ".design-ai";
const MAX_LEN = 6000;

function stripDangerous(css: string): string {
  let s = css;
  s = s.replace(/<\/?\s*(script|style)[^>]*>/gi, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.replace(/@import\s[^;]+;?/gi, "");
  s = s.replace(/@charset\s[^;]+;?/gi, "");
  // Only inline data images may be loaded; every other url() is removed.
  s = s.replace(/url\s*\(\s*(["']?)(?!data:image\/)[^)]*\)/gi, "none");
  s = s.replace(/image-set\s*\([^)]*\)/gi, "none");
  s = s.replace(/expression\s*\([^)]*\)/gi, "");
  s = s.replace(/-moz-binding\s*:[^;}]+;?/gi, "");
  s = s.replace(/behavior\s*:[^;}]+;?/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  // No overlays that cover or pin content to the screen.
  s = s.replace(/position\s*:\s*(fixed|sticky)\s*;?/gi, "");
  s = s.replace(/z-index\s*:\s*-?\d{2,}\s*;?/gi, "z-index: 1;");
  return s;
}

// Index of the "}" that closes the "{" at `open`.
function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function scopeSelector(sel: string): string {
  const t = sel.trim();
  if (!t) return "";
  if (t.includes(SCOPE) || /^\.tpl\b/.test(t)) return t;
  const swapped = t.replace(/^(:root|html|body)\b/i, SCOPE);
  return swapped.startsWith(SCOPE) ? swapped : `${SCOPE} ${swapped}`;
}

function scopeBlock(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const close = matchBrace(css, open);
    if (close === -1) break;
    const prelude = css.slice(i, open).trim();
    const body = css.slice(open + 1, close);
    i = close + 1;
    if (/^@(-\w+-)?keyframes\b/i.test(prelude)) {
      out += `${prelude}{${body}}`;
    } else if (/^@(media|supports)\b/i.test(prelude)) {
      out += `${prelude}{${scopeBlock(body)}}`;
    } else if (prelude.startsWith("@")) {
      // @font-face, @page, @namespace and the like are dropped.
      continue;
    } else {
      const sels = prelude.split(",").map(scopeSelector).filter(Boolean).join(",");
      if (sels) out += `${sels}{${body}}`;
    }
  }
  return out;
}

export function sanitizeCSS(css: string): string {
  const capped = stripDangerous(css).slice(0, MAX_LEN * 2);
  const scoped = scopeBlock(capped);
  return scoped.length > MAX_LEN ? scoped.slice(0, scoped.lastIndexOf("}", MAX_LEN) + 1) : scoped;
}
