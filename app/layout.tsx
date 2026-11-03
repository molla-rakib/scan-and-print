import type { Metadata } from "next"
import { Anek_Bangla, Poppins } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// Bangla text renders in Anek Bangla. Poppins comes first in the font stack but has no
// Bangla glyphs, so English words use Poppins and Bangla (including ০-৯ digits) falls back to Anek Bangla.
const anekBangla = Anek_Bangla({
  variable: "--font-anek-bangla",
  subsets: ["bengali", "latin"],
})

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: { default: "স্ক্যান অ্যান্ড প্রিন্ট", template: "%s · স্ক্যান অ্যান্ড প্রিন্ট" },
  description: "QR কোড স্ক্যান করুন, PDF আপলোড করুন, বিকাশে পেমেন্ট করুন — প্রিন্ট হয়ে যাবে স্বয়ংক্রিয়ভাবে।",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${anekBangla.variable} ${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
