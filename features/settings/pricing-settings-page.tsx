import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PhotoForm } from "./components/photo-form"
import { PricingForm } from "./components/pricing-form"
import { getPhotoSettings, getPricingSettings } from "./queries"

/** /dashboard/settings/pricing: print prices per paper size, and passport photo sheets. */
export function PricingSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-[220px]" />}>
        <PricingSection />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[200px]" />}>
        <PhotoSection />
      </Suspense>
    </div>
  )
}

async function PricingSection() {
  return <PricingForm initial={await getPricingSettings()} />
}

async function PhotoSection() {
  return <PhotoForm initial={await getPhotoSettings()} />
}
