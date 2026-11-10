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
  // Sheet prices that were never set show the one-side price, which is what customers are charged.
  const prices = (p: { bw: number; color: number; bwSheet?: number | null; colorSheet?: number | null }) => ({
    bw: p.bw,
    color: p.color,
    bwSheet: p.bwSheet ?? p.bw,
    colorSheet: p.colorSheet ?? p.color,
  })
  return (
    <PricingForm
      initial={{
        ...prices(shop.pricing),
        colorDuplex: shop.pricing.colorDuplex,
        paperSizes: {
          Legal: { enabled: shop.paperSizes.Legal.enabled, ...prices(shop.paperSizes.Legal) },
          A3: { enabled: shop.paperSizes.A3.enabled, ...prices(shop.paperSizes.A3) },
        },
      }}
    />
  )
}
