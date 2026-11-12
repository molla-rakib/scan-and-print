import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/lib/env"
import { BkashForm } from "./components/bkash-form"
import { CashForm } from "./components/cash-form"
import { getPaymentSettings } from "./queries"

/** /dashboard/settings/payment: cash and bKash merchant settings. */
export function PaymentSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[640px]" />}>
      <PaymentSection />
    </Suspense>
  )
}

async function PaymentSection() {
  const { cash, bkash } = await getPaymentSettings()
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <CashForm initial={cash} />
      <BkashForm appUrl={env.appUrl} initial={bkash} />
    </div>
  )
}
