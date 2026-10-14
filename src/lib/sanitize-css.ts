/**
 * Sanitise AI-generated CSS before injecting it into the page via dangerouslySetInnerHTML.
 * Strips anything that could execute JS or fetch external resources.
 */
export function sanitizeCSS(css: string): string {
  let s = css;

  // Remove anything inside <script> tags (shouldn't be here, but just in case)
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove </style> tags that could break out of the style element
  s = s.replace(/<\/style\s*>/gi, "");

  // Remove @import rules (could load external stylesheets)
  s = s.replace(/@import\s[^;]+;/gi, "");

  // Remove url() pointing to external resources (keep data: URIs and empty ones)
  s = s.replace(/url\s*\(\s*["']?https?:\/\/[^)]+\)/gi, "url()");
  s = s.replace(/url\s*\(\s*["']?\/\/[^)]+\)/gi, "url()");

  // Remove expression() — IE CSS expression attack vector
  s = s.replace(/expression\s*\([^)]*\)/gi, "");

  // Remove -moz-binding (Firefox XBL injection)
  s = s.replace(/-moz-binding\s*:[^;]+;?/gi, "");

  // Remove behavior: (IE htc files)
  s = s.replace(/behavior\s*:[^;]+;?/gi, "");

  // Remove javascript: in any context
  s = s.replace(/javascript\s*:/gi, "");

  // Cap size to prevent abuse
  if (s.length > 6000) s = s.slice(0, 6000);

  return s;
}
