import type { Metadata } from "next"
import { PricingSettingsPage } from "@/features/settings/pricing-settings-page"

export const metadata: Metadata = { title: "প্রিন্টের দাম · সেটিংস" }

export default function Page() {
  return <PricingSettingsPage />
}
