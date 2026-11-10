import type { Metadata } from "next"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { env } from "@/lib/env"
import { ProfileForm } from "./settings-forms"

export const metadata: Metadata = { title: "দোকানের তথ্য · সেটিংস" }

export default function ShopSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[300px]" />}>
      <ShopSection />
    </Suspense>
  )
}

async function ShopSection() {
  const { shop } = await requireShop()
  return (
    <ProfileForm
      appUrl={env.appUrl}
      initial={{ name: shop.name, slug: shop.slug, address: shop.address, phone: shop.phone }}
    />
  )
}
