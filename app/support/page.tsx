import type { Metadata } from "next"
import { SupportPage } from "@/features/support/support-page"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata(
  "/support",
  "সাপোর্ট",
  "মুদ্রণ ব্যবহারে কোনো সমস্যা? WhatsApp-এ আমাদের সাথে যোগাযোগ করুন, অথবা ইনস্টল গাইড ও প্রশ্নোত্তর দেখুন।",
)

export default function Page() {
  return <SupportPage />
}
