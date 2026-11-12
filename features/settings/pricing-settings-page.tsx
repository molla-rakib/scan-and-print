import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PricingForm } from "./components/pricing-form"
import { getPricingSettings } from "./queries"

/** /dashboard/settings/pricing: print prices per paper size. */
export function PricingSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[220px]" />}>
      <PricingSection />
    </Suspense>
  )
}

async function PricingSection() {
  return <PricingForm initial={await getPricingSettings()} />
}
