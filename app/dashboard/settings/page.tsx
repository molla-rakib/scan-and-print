import type { Metadata } from "next"
import { Suspense } from "react"
import { SettingsIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { env } from "@/lib/env"
import { BkashForm, CashForm, PricingForm, ProfileForm } from "./settings-forms"

export const metadata: Metadata = { title: "সেটিংস" }

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="সেটিংস" description="দোকানের তথ্য, প্রিন্টের দাম এবং পেমেন্ট পদ্ধতি।" icon={SettingsIcon} tone="sky" />
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Settings />
      </Suspense>
    </>
  )
}

async function Settings() {
  const { shop } = await requireShop()
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-6">
        <ProfileForm
          appUrl={env.appUrl}
          initial={{ name: shop.name, slug: shop.slug, address: shop.address, phone: shop.phone }}
        />
        <PricingForm initial={{ bw: shop.pricing.bw, color: shop.pricing.color }} />
      </div>
      <div className="flex flex-col gap-6">
        <CashForm enabled={shop.cash.enabled} />
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
      </div>
    </div>
  )
}
