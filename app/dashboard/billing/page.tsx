import type { Metadata } from "next"
import { Suspense } from "react"
import { CalendarClockIcon, ReceiptTextIcon, WalletIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireShop } from "@/lib/auth"
import { activeDiscount, availableBillingMethods, baseMonthlyFee, getBillingSettings, monthlyFee } from "@/lib/billing"
import {
  DAYS_PER_MONTH,
  SUBSCRIPTION_METHOD_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  formatDate,
  formatNumber,
  formatTaka,
  type SubscriptionMethod,
  type SubscriptionStatus,
} from "@/lib/constants"
import { env } from "@/lib/env"
import { subscriptionExpired } from "@/lib/jobs"
import { SubscriptionPayment } from "@/lib/models"
import { PayForm } from "./pay-form"
import { PaymentResult } from "./payment-result"

export const metadata: Metadata = { title: "বিল ও পেমেন্ট" }

export default function BillingPage() {
  return (
    <>
      <PageHeader title="বিল ও পেমেন্ট" description="সাবস্ক্রিপশনের মেয়াদ বাড়ান এবং আগের পেমেন্ট দেখুন।" icon={WalletIcon} tone="emerald" />
      <Suspense>
        <PaymentResult />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[560px]" />}>
        <Billing />
      </Suspense>
    </>
  )
}

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  pending: "border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "border-0 bg-destructive/10 text-destructive",
  cancelled: "border-0 bg-muted text-muted-foreground",
  rejected: "border-0 bg-destructive/10 text-destructive",
}

async function Billing() {
  const { shop } = await requireShop()
  const [settings, payments] = await Promise.all([
    getBillingSettings(),
    SubscriptionPayment.find({ shopId: shop._id }).sort({ createdAt: -1 }).limit(30),
  ])
  const methods = availableBillingMethods(settings).filter((m) => m !== "admin")
  const fee = monthlyFee(shop)
  const discount = activeDiscount(shop)
  const expired = subscriptionExpired(shop)
  // Gateway attempts the owner abandoned stay pending forever; only manual ones are really waiting.
  const isManual = (m: string) => m === "manual_bkash" || m === "manual_nagad"
  const hasPendingManual = payments.some((p) => p.status === "pending" && isManual(p.method))
  const shown = payments.filter((p) => p.status !== "pending" || isManual(p.method))

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
            monthlyFee={fee}
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
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">এখনো কোনো পেমেন্ট নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>মেয়াদ</TableHead>
                  <TableHead>টাকা</TableHead>
                  <TableHead>পদ্ধতি</TableHead>
                  <TableHead>TrxID</TableHead>
                  <TableHead>অবস্থা</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((p) => {
                  const status = p.status as SubscriptionStatus
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="tabular-nums">
                        {p.days % DAYS_PER_MONTH === 0 ? `${formatNumber(p.days / DAYS_PER_MONTH)} মাস` : `${formatNumber(p.days)} দিন`}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatTaka(p.amount)}</TableCell>
                      <TableCell>{SUBSCRIPTION_METHOD_LABELS[p.method as SubscriptionMethod]}</TableCell>
                      <TableCell className="font-mono text-xs">{p.trxId || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>
                        {status === "rejected" && p.note && <div className="mt-1 text-xs text-muted-foreground">{p.note}</div>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
