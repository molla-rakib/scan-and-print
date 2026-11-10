import type { Metadata } from "next"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { PricingForm } from "../settings-forms"

export const metadata: Metadata = { title: "প্রিন্টের দাম · সেটিংস" }

export default function PricingSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[220px]" />}>
      <PricingSection />
    </Suspense>
  )
}

async function PricingSection() {
  const { shop } = await requireShop()
  return <PricingForm
      initial={{
        bw: shop.pricing.bw,
        color: shop.pricing.color,
        paperSizes: {
          Legal: { enabled: shop.paperSizes.Legal.enabled, bw: shop.paperSizes.Legal.bw, color: shop.paperSizes.Legal.color },
          A3: { enabled: shop.paperSizes.A3.enabled, bw: shop.paperSizes.A3.bw, color: shop.paperSizes.A3.color },
        },
      }}
    />
}
