import type { Metadata } from "next"
import { TermsPage } from "@/features/terms/terms-page"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata(
  "/terms",
  "শর্তাবলি",
  "মুদ্রণ (Mudron) ব্যবহারের শর্তাবলি: দোকান মালিক ও গ্রাহকের দায়িত্ব, সাবস্ক্রিপশন ফি, পেমেন্ট ও টাকা ফেরত।",
)

export default function Page() {
  return <TermsPage />
}
