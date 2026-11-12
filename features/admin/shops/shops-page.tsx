import { Suspense } from "react"
import { CheckCircle2Icon, MonitorIcon, StoreIcon, TrendingUpIcon } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { TablePagination } from "@/components/table-pagination"
import { TableSearch } from "@/components/table-search"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireAdmin } from "@/lib/auth"
import { formatNumber, formatTaka } from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { readListParams } from "@/lib/list-params"
import { ShopsTable } from "./components/shops-table"
import { loadShopStats, loadShopsPage } from "./queries"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** /dashboard/admin: totals over all shops, then the searchable, paged shops table. */
export function ShopsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Shops searchParams={searchParams} />
    </Suspense>
  )
}

async function Shops({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  await connectDb()
  const list = readListParams(await searchParams)
  const [totals, { rows, total }] = await Promise.all([loadShopStats(), loadShopsPage(list)])

  const stats = [
    { label: "মোট দোকান", value: formatNumber(totals.totalShops), icon: StoreIcon, tone: "blue" as const },
    { label: "সক্রিয় দোকান", value: formatNumber(totals.activeShops), icon: CheckCircle2Icon, tone: "emerald" as const },
    {
      label: "চালু ডিভাইস",
      value: formatNumber(totals.enabledDevices),
      icon: MonitorIcon,
      tone: "violet" as const,
    },
    {
      label: "এই মাসের আয়",
      value: formatTaka(totals.monthIncome),
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
        <CardContent className="flex flex-col gap-4">
          {totals.totalShops === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">এখনো কোনো দোকান নেই।</p>
          ) : (
            <>
              <TableSearch placeholder="নাম, ফোন, লিংক বা ইমেইল" />
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">কোনো দোকান মেলেনি।</p>
              ) : (
                <ShopsTable rows={rows} />
              )}
              <TablePagination page={list.page} total={total} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
