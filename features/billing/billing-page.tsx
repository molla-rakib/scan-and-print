import { Suspense } from "react"
import { CalendarClockIcon, ReceiptTextIcon, WalletIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { activeDiscount, availableBillingMethods, baseMonthlyFee, canChangeDevices, monthlyFee } from "@/lib/billing"
import { formatDate, formatNumber, formatTaka } from "@/lib/constants"
import { env } from "@/lib/env"
import { daysLeft, subscriptionExpired } from "@/lib/jobs"
import { readListParams } from "@/lib/list-params"
import { PayForm } from "./components/pay-form"
import { PaymentHistory } from "./components/payment-history"
import { PaymentResult } from "./components/payment-result"
import { getBillingData } from "./queries"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** /dashboard/billing: subscription status, the renewal form and the payment history. */
export function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="বিল ও পেমেন্ট" description="সাবস্ক্রিপশনের মেয়াদ বাড়ান এবং আগের পেমেন্ট দেখুন।" icon={WalletIcon} tone="emerald" />
      <Suspense>
        <PaymentResult />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[560px]" />}>
        <Billing searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Billing({ searchParams }: { searchParams: SearchParams }) {
  const [{ shop }, list] = await Promise.all([requireShop(), searchParams.then((params) => readListParams(params))])
  const { settings, payments, total, enabledDevices, everPaid, hasPendingManual } = await getBillingData(shop, list)
  const methods = availableBillingMethods(settings).filter((m) => m !== "admin")
  const fee = monthlyFee(shop)
  const discount = activeDiscount(shop)
  const expired = subscriptionExpired(shop)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="min-w-0 xl:order-2 xl:self-start">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={CalendarClockIcon} tone={expired ? "rose" : "emerald"} />
            <div>
              <CardTitle>সাবস্ক্রিপশন</CardTitle>
              <CardDescription>ডিভাইস প্রতি মাসে {formatTaka(env.deviceMonthlyFee)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">ডিভাইস লিমিট</span>
            <span className="font-medium tabular-nums">{formatNumber(shop.deviceLimit)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">মাসিক ফি</span>
            <span className="font-medium tabular-nums">
              {discount && <span className="mr-1.5 text-xs font-normal text-muted-foreground line-through">{formatTaka(baseMonthlyFee(shop))}</span>}
              {formatTaka(fee)}
            </span>
          </div>
          {discount && (
            <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-400">
              {discount.kind === "percent" ? `আপনি ${formatNumber(discount.value)}% ছাড় পাচ্ছেন` : "আপনার জন্য বিশেষ মাসিক ফি"}
              {discount.until && ` (${formatDate(discount.until)} পর্যন্ত)`}
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{expired ? "মেয়াদ শেষ হয়েছে" : "মেয়াদ আছে"}</span>
            <span className={expired ? "font-medium text-destructive" : "font-medium"}>{formatDate(shop.paidUntil)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 xl:order-1">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={WalletIcon} tone="blue" />
            <CardTitle>মেয়াদ বাড়ান</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PayForm
            deviceFee={env.deviceMonthlyFee}
            discount={discount && { kind: discount.kind, value: discount.value }}
            deviceLimit={shop.deviceLimit}
            enabledDevices={enabledDevices}
            canChangeDevices={canChangeDevices(shop)}
            daysLeft={daysLeft(shop)}
            onTrial={!everPaid}
            methods={methods}
            manual={{ bkashNumber: settings.manual.bkashNumber, nagadNumber: settings.manual.nagadNumber, instructions: settings.manual.instructions }}
            hasPendingManual={hasPendingManual}
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 xl:order-3 xl:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={ReceiptTextIcon} tone="violet" />
            <CardTitle>পেমেন্টের ইতিহাস</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentHistory payments={payments} total={total} q={list.q} page={list.page} />
        </CardContent>
      </Card>
    </div>
  )
}
