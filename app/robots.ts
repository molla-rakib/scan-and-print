import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/seo"

// Search engines and AI crawlers may read the public pages (home, shop pages, llms.txt). Signed-in
// areas, the API and customers' order pages stay out. AI crawlers are named so it is explicit that
// they are welcome; `*` already covers them.
const crawlers = [
  "*",
  "Googlebot",
  "Bingbot",
  "Google-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: crawlers,
      allow: "/",
      disallow: ["/dashboard", "/onboarding", "/login", "/api/", "/j/"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  }
}
