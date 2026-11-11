import type { Metadata } from "next"
import { Noto_Sans_Bengali } from "next/font/google"
import { GoogleTagManager } from "@next/third-parties/google"
import { env } from "@/lib/env"
import { seo } from "@/lib/seo"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// Noto Sans Bengali covers both Bangla and Latin, so a single font is used site-wide.
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali", "latin"],
})

// Built once at build time, so APP_URL comes in as a Docker build arg (docker-compose.prod.yml).
export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: seo.title, template: "%s · মুদ্রণ" },
  applicationName: `${seo.name} (${seo.nameEn})`,
  description: seo.description,
  keywords: seo.keywords,
  category: "business",
  // No canonical here: it would be inherited by every page. Pages set their own.
  openGraph: {
    type: "website",
    siteName: `${seo.name} (${seo.nameEn})`,
    title: seo.title,
    description: seo.description,
    locale: "bn_BD",
  },
  twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Google Tag Manager (Google Analytics is set up inside it). Production builds only, so local
  // development does not count as visits. The layout is prerendered, so the ID is baked in at build time.
  const gtmId = process.env.NODE_ENV === "production" ? env.googleAnalyticsId : null
  return (
    <html lang="bn" className={`${notoBengali.variable} h-full antialiased`}>
      {gtmId && <GoogleTagManager gtmId={gtmId} />}
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
