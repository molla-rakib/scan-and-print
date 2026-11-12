import type { Metadata } from "next"
import { PaymentSetupPage } from "@/features/admin/payment-setup/payment-setup-page"

export const metadata: Metadata = { title: "পেমেন্ট সেটআপ · অ্যাডমিন" }

export default function Page() {
  return <PaymentSetupPage />
}
