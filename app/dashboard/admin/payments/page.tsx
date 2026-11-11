import type { Metadata } from "next"
import { Suspense } from "react"
import { ClockIcon, ReceiptTextIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import {
  DAYS_PER_MONTH,
  SUBSCRIPTION_METHOD_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  formatDateTime,
  formatNumber,
  formatTaka,
  type SubscriptionMethod,
  type SubscriptionStatus,
} from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { Shop, SubscriptionPayment } from "@/lib/models"
import { PaymentReview } from "./payment-review"

export const metadata: Metadata = { title: "পেমেন্ট · অ্যাডমিন" }

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Payments />
    </Suspense>
  )
}

const MANUAL: SubscriptionMethod[] = ["manual_bkash", "manual_nagad"]

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  pending: "border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "border-0 bg-destructive/10 text-destructive",
  cancelled: "border-0 bg-muted text-muted-foreground",
  rejected: "border-0 bg-destructive/10 text-destructive",
}

function period(days: number) {
  return days % DAYS_PER_MONTH === 0 ? `${formatNumber(days / DAYS_PER_MONTH)} মাস` : `${formatNumber(days)} দিন`
}

async function Payments() {
  await requireAdmin()
  await connectDb()
  const [waiting, recent] = await Promise.all([
    SubscriptionPayment.find({ status: "pending", method: { $in: MANUAL } }).sort({ createdAt: 1 }),
    // Abandoned gateway attempts stay pending; they are noise here.
    SubscriptionPayment.find({ $nor: [{ status: "pending", method: { $nin: MANUAL } }] }).sort({ createdAt: -1 }).limit(50),
  ])
  const shops = await Shop.find({ _id: { $in: [...waiting, ...recent].map((p) => p.shopId) } }).select("name slug")
  const shopName = (id: unknown) => shops.find((s) => s._id.equals(id as string))?.name ?? "—"

  return (
    <>
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={ClockIcon} tone="amber" />
            <div>
              <CardTitle>যাচাইয়ের অপেক্ষায়</CardTitle>
              <CardDescription>আমাদের বিকাশ/নগদ অ্যাকাউন্টে টাকা এসেছে কিনা দেখে Approve করুন।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">কোনো পেমেন্ট অপেক্ষায় নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>দোকান</TableHead>
                  <TableHead>টাকা</TableHead>
                  <TableHead>পদ্ধতি</TableHead>
                  <TableHead>TrxID</TableHead>
                  <TableHead>পাঠানো নম্বর</TableHead>
                  <TableHead>সময়</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiting.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{shopName(p.shopId)}</div>
                      <div className="text-xs text-muted-foreground">{period(p.days)}</div>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{formatTaka(p.amount)}</TableCell>
                    <TableCell>{SUBSCRIPTION_METHOD_LABELS[p.method as SubscriptionMethod]}</TableCell>
                    <TableCell className="font-mono">{p.trxId}</TableCell>
                    <TableCell className="font-mono">{p.senderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell>
                      <PaymentReview paymentId={p.id} label={`${shopName(p.shopId)} · ${formatTaka(p.amount)} · TrxID ${p.trxId}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={ReceiptTextIcon} tone="violet" />
            <CardTitle>সাম্প্রতিক পেমেন্ট</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">এখনো কোনো পেমেন্ট নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>দোকান</TableHead>
                  <TableHead>টাকা</TableHead>
                  <TableHead>মেয়াদ</TableHead>
                  <TableHead>পদ্ধতি</TableHead>
                  <TableHead>TrxID</TableHead>
                  <TableHead>অবস্থা</TableHead>
                  <TableHead>সময়</TableHead>
                  <TableHead>যিনি করেছেন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((p) => {
                  const status = (p.status ?? "paid") as SubscriptionStatus
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{shopName(p.shopId)}</TableCell>
                      <TableCell className="tabular-nums">{formatTaka(p.amount)}</TableCell>
                      <TableCell>{period(p.days)}</TableCell>
                      <TableCell>{SUBSCRIPTION_METHOD_LABELS[(p.method ?? "admin") as SubscriptionMethod]}</TableCell>
                      <TableCell className="font-mono text-xs">{p.trxId || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(p.paidAt ?? p.createdAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.recordedBy || p.submittedBy || "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
