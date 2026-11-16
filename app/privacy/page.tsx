import type { Metadata } from "next"
import { PrivacyPage } from "@/features/privacy/privacy-page"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata(
  "/privacy",
  "গোপনীয়তা নীতি",
  "মুদ্রণ (Mudron) কোন তথ্য রাখে, কেন রাখে, কতদিন রাখে। প্রিন্টের পরই ফাইল মুছে ফেলা হয়।",
)

export default function Page() {
  return <PrivacyPage />
}
