import type { Metadata } from "next"
import { Noto_Sans_Bengali } from "next/font/google"
import { GoogleTagManager } from "@next/third-parties/google"
import { env } from "@/lib/env"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// Noto Sans Bengali covers both Bangla and Latin, so a single font is used site-wide.
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali", "latin"],
})

export const metadata: Metadata = {
  title: { default: "মুদ্রণ", template: "%s · মুদ্রণ" },
  applicationName: "মুদ্রণ (Mudron)",
  description: "QR কোড স্ক্যান করুন, PDF আপলোড করুন, বিকাশে পেমেন্ট করুন — প্রিন্ট হয়ে যাবে স্বয়ংক্রিয়ভাবে।",
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
