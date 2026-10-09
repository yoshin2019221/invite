import type { MetadataRoute } from "next";

// Invite pages are noindex by meta tag, and are not blocked here so WhatsApp can still fetch
// their preview cards. Only the private host pages are disallowed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: ["/en/edit/", "/hi/edit/"] }],
  };
}
