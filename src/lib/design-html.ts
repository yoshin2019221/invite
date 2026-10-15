// AI-designed invites: the AI writes one self-contained HTML page (HTML + CSS + a little JS for motion).
// That page is untrusted. It is only ever shown inside an iframe with sandbox="allow-scripts"
// (no same-origin access, no forms, no popups, no top navigation) and a strict Content-Security-Policy
// (no network at all except Google Fonts). The regex clean-up below is a second layer, not the boundary.
//
// The stored HTML keeps {{placeholders}} so edits to the host's details show up without regenerating.

import type { ThemeColors } from "@/lib/themes";

export const MAX_DESIGN_HTML = 40_000;

export type DesignVars = {
  title: string;
  hosts: string;
  occasion: string;
  date: string;
  day: string;
  month: string;
  year: string;
  weekday: string;
  time: string;
  venue: string;
  address: string;
  message: string;
  iso: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ---------- clean-up ----------

export function sanitizeDesignHtml(input: string): string {
  let s = input.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Document wrappers: we build our own.
  s = s.replace(/<!doctype[^>]*>/gi, "").replace(/<\/?(html|head|body)\b[^>]*>/gi, "");
  // Whole elements that can load or embed outside content, then stray tags of form controls.
  s = s.replace(/<(iframe|object|embed|frame|frameset|applet|template)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, "");
  s = s.replace(/<\/?(iframe|object|embed|base|form|input|textarea|select)\b[^>]*>/gi, "");
  // External scripts. Inline scripts stay (sandboxed, no network).
  s = s.replace(/<script\b[^>]*\bsrc\s*=[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  // <meta> (the colour hint is read before this runs) and <link> other than Google Fonts.
  s = s.replace(/<meta\b[^>]*>/gi, "");
  s = s.replace(/<link\b[^>]*>/gi, (tag) => (/href\s*=\s*["']https:\/\/fonts\.googleapis\.com\//i.test(tag) && /rel\s*=\s*["']stylesheet["']/i.test(tag) ? tag : ""));
  // Navigation and remote sources: only in-page "#" links and inline data images survive.
  s = s.replace(/\s(href|xlink:href)\s*=\s*("|')(?!#|https:\/\/fonts\.googleapis\.com\/)[^"']*\2/gi, "");
  s = s.replace(/\s(src|poster|data|srcset|action|formaction|ping|background)\s*=\s*("|')(?!data:image\/)[^"']*\2/gi, "");
  s = s.replace(/\s(srcdoc|target)\s*=\s*("|')[^"']*\2/gi, "");
  // CSS: no @import, no url() except inline data images.
  s = s.replace(/@import\s[^;]+;?/gi, "");
  s = s.replace(/url\s*\(\s*(["']?)(?!data:image\/)[^)]*\)/gi, "none");
  s = s.replace(/image-set\s*\([^)]*\)/gi, "none");
  s = s.replace(/expression\s*\([^)]*\)/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.trim();
  return s.length > MAX_DESIGN_HTML ? "" : s; // refuse oversize output instead of cutting it mid-tag
}

// A usable design has real markup and a visible text placeholder from the host.
export function looksLikeDesign(html: string): boolean {
  return html.length >= 400 && /<(main|div|section|article)\b/i.test(html) && html.includes("{{title}}");
}

// ---------- palette for the native sections under the frame ----------

const HEX = /^#[0-9a-f]{6}$/i;
export const DEFAULT_COLORS: ThemeColors = {
  paper: "#fbf3e4", paperDeep: "#f3e4c8", ink: "#3a1d12", inkSoft: "#6b4a3a",
  accent: "#7a1f2b", accentDeep: "#5c141f", highlight: "#c97a10",
};

// The AI states its colours in <meta name="invite-colors" content="paper=#..;ink=#..;accent=#..">.
export function extractPalette(raw: string): ThemeColors {
  const tag = raw.match(/<meta[^>]*name\s*=\s*["']invite-colors["'][^>]*>/i)?.[0] ?? "";
  const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  const got: Record<string, string> = {};
  for (const part of content.split(/[;,]/)) {
    const [k, v] = part.split("=").map((x) => x?.trim());
    if (k && v && HEX.test(v)) got[k] = v;
  }
  const c = { ...DEFAULT_COLORS };
  (Object.keys(c) as (keyof ThemeColors)[]).forEach((k) => { if (got[k]) c[k] = got[k]; });
  // If only the basics were given, derive the rest so text stays readable.
  if (!got.paperDeep) c.paperDeep = c.paper;
  if (!got.accentDeep) c.accentDeep = c.accent;
  if (!got.inkSoft) c.inkSoft = c.ink;
  return c;
}

export function isDark(hex: string): boolean {
  if (!HEX.test(hex)) return false;
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.45;
}

// ---------- placeholders ----------

const loc = (l: string) => (l === "hi" ? "hi-IN" : "en-IN");

export function designVars(i: {
  locale: string; title: string; hosts: string; occasion: string; startsAtIso: string; timeZone?: string;
  venue?: string | null; address?: string | null; message?: string | null;
}): DesignVars {
  const tz = i.timeZone || "Asia/Kolkata";
  const d = new Date(i.startsAtIso);
  const ok = !Number.isNaN(d.getTime());
  const f = (o: Intl.DateTimeFormatOptions) => (ok ? new Intl.DateTimeFormat(loc(i.locale), { ...o, timeZone: tz }).format(d) : "");
  return {
    title: i.title,
    hosts: i.hosts,
    occasion: i.occasion,
    date: f({ day: "numeric", month: "long", year: "numeric" }),
    day: f({ day: "numeric" }),
    month: f({ month: "long" }),
    year: f({ year: "numeric" }),
    weekday: f({ weekday: "long" }),
    time: f({ hour: "numeric", minute: "2-digit", hour12: true }),
    venue: i.venue ?? "",
    address: i.address ?? "",
    message: i.message ?? "",
    iso: ok ? d.toISOString() : "",
  };
}

const safeJson = (v: unknown) =>
  JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  "img-src data:",
  "media-src data:",
  "script-src 'unsafe-inline'",
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

// Our own, trusted runtime inside the frame: data-if, data-countdown, data-rsvp and height reporting.
const RUNTIME = `(function(){var I=window.INVITE;document.documentElement.style.setProperty("--vh",Math.max(5,Math.min(innerHeight||700,900)/100)+"px");document.body.setAttribute("data-start",I.iso);
document.querySelectorAll("[data-if]").forEach(function(e){if(!I[e.getAttribute("data-if")])e.remove()});
function p(n){return n<10?"0"+n:""+n}
function tick(){if(!I.iso)return;var s=Math.max(0,Math.floor((new Date(I.iso)-Date.now())/1000));var v={days:Math.floor(s/86400),hours:Math.floor(s%86400/3600),minutes:Math.floor(s%3600/60),seconds:s%60};
document.querySelectorAll("[data-countdown]").forEach(function(e){var k=e.getAttribute("data-countdown");if(k in v)e.textContent=k==="days"?String(v[k]):p(v[k])})}
tick();setInterval(tick,1000);
document.querySelectorAll("[data-rsvp]").forEach(function(e){e.addEventListener("click",function(x){x.preventDefault();parent.postMessage({type:"invite-rsvp"},"*")})});
function h(){parent.postMessage({type:"invite-height",h:Math.ceil(document.body.getBoundingClientRect().bottom+(window.scrollY||0))},"*")}
if(window.ResizeObserver)new ResizeObserver(h).observe(document.documentElement);addEventListener("load",h);h();[300,1200,3000].forEach(function(t){setTimeout(h,t)});
addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.type==="invite-vh"&&d.v>0){document.documentElement.style.setProperty("--vh",d.v+"px");h()}if(d.type==="invite-ping")h()});})();`;

export function fillPlaceholders(html: string, v: DesignVars): string {
  return html.replace(/\{\{\s*([a-z]+)\s*\}\}/gi, (_m, k: string) => esc((v as Record<string, string>)[k.toLowerCase()] ?? ""));
}

// The complete document that goes into the sandboxed iframe's srcdoc.
export function buildSrcDoc(storedHtml: string, v: DesignVars, lang: string): string {
  // vh units inside a frame that grows to fit its content feed back on themselves (the page keeps getting
  // taller). Every vh becomes a multiple of --vh, which the runtime sets once to a fixed value.
  const body = fillPlaceholders(sanitizeDesignHtml(storedHtml), v)
    .replace(/(-?\d*\.?\d+)\s*(?:d|s|l)?vh\b/gi, (_m, n: string) => `calc(${n} * var(--vh, 7px))`);
  return `<!doctype html><html lang="${lang === "hi" ? "hi" : "en"}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
    `<style>html,body{margin:0;padding:0}*{box-sizing:border-box}</style></head><body><div id="invite-root">${body}</div>` +
    `<style>html{overflow-x:hidden!important;height:auto!important}body{display:block!important;height:auto!important;max-width:100vw;overflow-x:hidden!important}#invite-root{display:block;width:100%;max-width:100vw;overflow-x:hidden}</style>` +
    `<script>window.INVITE=${safeJson(v)};</script><script>${RUNTIME}</script></body></html>`;
}
