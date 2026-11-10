import type { Metadata } from "next"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { env } from "@/lib/env"
import { BkashForm, CashForm } from "../settings-forms"

export const metadata: Metadata = { title: "পেমেন্ট · সেটিংস" }

export default function PaymentSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[640px]" />}>
      <PaymentSection />
    </Suspense>
  )
}

async function PaymentSection() {
  const { shop } = await requireShop()
  return (
    <>
      <CashForm
        initial={{
          enabled: shop.cash.enabled,
          askName: shop.cash.askName ?? true,
          askPhone: shop.cash.askPhone ?? true,
        }}
      />
      <BkashForm
        appUrl={env.appUrl}
        initial={{
          enabled: shop.bkash.enabled,
          sandbox: shop.bkash.sandbox,
          username: shop.bkash.username,
          appKey: shop.bkash.appKey,
          hasPassword: Boolean(shop.bkash.passwordEnc),
          hasAppSecret: Boolean(shop.bkash.appSecretEnc),
        }}
      />
    </>
  )
}
