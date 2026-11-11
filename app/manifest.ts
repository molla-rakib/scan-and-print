import type { MetadataRoute } from "next"
import { seo } from "@/lib/seo"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${seo.name} (${seo.nameEn})`,
    short_name: seo.name,
    description: seo.description,
    lang: "bn",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/images/logo-small.svg", sizes: "any", type: "image/svg+xml" },
    ],
  }
}
