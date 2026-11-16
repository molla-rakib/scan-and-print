import type { Metadata } from "next"
import { PaymentSettingsPage } from "@/features/settings/payment-settings-page"

export const metadata: Metadata = { title: "পেমেন্ট · সেটিংস" }

export default function Page() {
  return <PaymentSettingsPage />
}
