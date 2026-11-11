import type { Metadata } from "next"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { requireAdmin } from "@/lib/auth"
import { getBillingSettings } from "@/lib/billing"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { BkashSetupForm, EpsSetupForm, ManualSetupForm } from "./setup-forms"

export const metadata: Metadata = { title: "পেমেন্ট সেটআপ · অ্যাডমিন" }

export default function PaymentSetupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[720px]" />}>
      <Setup />
    </Suspense>
  )
}

async function Setup() {
  await requireAdmin()
  await connectDb()
  const { manual, bkash, eps } = await getBillingSettings()
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <p className="text-sm text-muted-foreground xl:col-span-2">দোকানদাররা যেসব পদ্ধতিতে আমাদের সাবস্ক্রিপশন ফি দিতে পারবেন। যেটি চালু থাকবে, শুধু সেটিই দোকানদার দেখবেন।</p>
      <ManualSetupForm
        initial={{ enabled: manual.enabled, bkashNumber: manual.bkashNumber, nagadNumber: manual.nagadNumber, instructions: manual.instructions }}
      />
      <BkashSetupForm
        appUrl={env.appUrl}
        initial={{
          enabled: bkash.enabled,
          sandbox: bkash.sandbox,
          username: bkash.username,
          appKey: bkash.appKey,
          hasPassword: Boolean(bkash.passwordEnc),
          hasAppSecret: Boolean(bkash.appSecretEnc),
        }}
      />
      <EpsSetupForm
        appUrl={env.appUrl}
        initial={{
          enabled: eps.enabled,
          sandbox: eps.sandbox,
          merchantId: eps.merchantId,
          storeId: eps.storeId,
          username: eps.username,
          hasPassword: Boolean(eps.passwordEnc),
          hasHashKey: Boolean(eps.hashKeyEnc),
        }}
      />
    </div>
  )
}
