import type { Metadata } from "next"
import { Suspense } from "react"
import type { Types } from "mongoose"
import { CheckCircle2Icon, MonitorIcon, ShieldIcon, StoreIcon, TrendingUpIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { formatDate, formatNumber, formatTaka } from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { daysAgo, shopIsOpen, startOfMonthInDhaka, subscriptionExpired } from "@/lib/jobs"
import { Device, PrintJob, Shop, SubscriptionPayment, User } from "@/lib/models"
import { ShopActions } from "./shop-actions"

export const metadata: Metadata = { title: "অ্যাডমিন" }

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="সব দোকান"
        description="সাবস্ক্রিপশন, ডিভাইস লিমিট এবং দোকানের অবস্থা পরিচালনা করুন।"
        icon={ShieldIcon}
        tone="rose"
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Shops />
      </Suspense>
    </>
  )
}

function countBy(rows: { _id: Types.ObjectId; count: number }[], id: Types.ObjectId) {
  return rows.find((row) => row._id.equals(id))?.count ?? 0
}

async function Shops() {
  await requireAdmin()
  await connectDb()
  const monthAgo = daysAgo(30)

  const [shops, enabledDevices, monthlyJobs, monthIncome] = await Promise.all([
    Shop.find().sort({ createdAt: -1 }),
    Device.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { enabled: true } },
      { $group: { _id: "$shopId", count: { $sum: 1 } } },
    ]),
    PrintJob.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { queuedAt: { $gte: monthAgo } } },
      { $group: { _id: "$shopId", count: { $sum: 1 } } },
    ]),
    // Only money actually received (recorded when extending a subscription), this calendar month.
    SubscriptionPayment.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: startOfMonthInDhaka() } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ])
  const owners = await User.find({ _id: { $in: shops.map((s) => s.ownerId) } }).select("email")
  const ownerEmail = (id: Types.ObjectId) => owners.find((o) => o._id.equals(id))?.email ?? "—"

  const activeShops = shops.filter(shopIsOpen)
  const stats = [
    { label: "মোট দোকান", value: formatNumber(shops.length), icon: StoreIcon, tone: "blue" as const },
    { label: "সক্রিয় দোকান", value: formatNumber(activeShops.length), icon: CheckCircle2Icon, tone: "emerald" as const },
    {
      label: "চালু ডিভাইস",
      value: formatNumber(enabledDevices.reduce((sum, row) => sum + row.count, 0)),
      icon: MonitorIcon,
      tone: "violet" as const,
    },
    {
      label: "এই মাসের আয়",
      value: formatTaka(monthIncome[0]?.total ?? 0),
      icon: TrendingUpIcon,
      tone: "amber" as const,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="min-w-0">
        <CardContent>
          {shops.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">এখনো কোনো দোকান নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>দোকান</TableHead>
                  <TableHead>মালিক</TableHead>
                  <TableHead>ডিভাইস</TableHead>
                  <TableHead>৩০ দিনের অর্ডার</TableHead>
                  <TableHead>মেয়াদ</TableHead>
                  <TableHead>অবস্থা</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => {
                  const expired = subscriptionExpired(shop)
                  return (
                    <TableRow key={shop.id}>
                      <TableCell>
                        <div className="font-medium">{shop.name}</div>
                        <div className="text-xs text-muted-foreground">/s/{shop.slug}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ownerEmail(shop.ownerId)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(countBy(enabledDevices, shop._id))} / {formatNumber(shop.deviceLimit)}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatNumber(countBy(monthlyJobs, shop._id))}</TableCell>
                      <TableCell className={expired ? "text-destructive" : undefined}>{formatDate(shop.paidUntil)}</TableCell>
                      <TableCell>
                        {shop.status === "suspended" ? (
                          <Badge variant="destructive">বন্ধ</Badge>
                        ) : expired ? (
                          <Badge variant="outline">মেয়াদোত্তীর্ণ</Badge>
                        ) : (
                          <Badge className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">সক্রিয়</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ShopActions
                          shop={{ id: shop.id, name: shop.name, deviceLimit: shop.deviceLimit, suspended: shop.status === "suspended" }}
                          monthlyFee={env.deviceMonthlyFee}
                        />
                      </TableCell>
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
