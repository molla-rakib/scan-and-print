import { Suspense } from "react"
import { InboxIcon, ListOrderedIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { LiveRefresh } from "@/components/live-refresh"
import { PageHeader } from "@/components/page-header"
import { TablePagination } from "@/components/table-pagination"
import { TableSearch } from "@/components/table-search"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { readListParams } from "@/lib/list-params"
import { DeleteHistoryButton } from "./components/delete-history-button"
import { OrdersTable } from "./components/orders-table"
import { loadOrders } from "./queries"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** /dashboard/jobs: every order of the shop, searchable and paged, with print and order actions. */
export function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        title="প্রিন্ট অর্ডার"
        description="নতুন অর্ডার স্বয়ংক্রিয়ভাবে এখানে দেখা যাবে।"
        icon={ListOrderedIcon}
        tone="violet"
      >
        <DeleteHistoryButton />
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Jobs searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Jobs({ searchParams }: { searchParams: SearchParams }) {
  const { shop } = await requireShop()
  const list = readListParams(await searchParams)
  const { latestCash, rows, total, deviceName } = await loadOrders(shop._id, list)

  return (
    <>
      <LiveRefresh latestCash={latestCash} />

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={ListOrderedIcon} tone="violet" variant="soft" />
            <div>
              <CardTitle>সব অর্ডার</CardTitle>
              <CardDescription>নতুন অর্ডার সবার উপরে</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {total === 0 && !list.q && list.page === 1 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>এখনো কোনো অর্ডার নেই</EmptyTitle>
                <EmptyDescription>গ্রাহক QR কোড স্ক্যান করে অর্ডার দিলে এখানে দেখা যাবে।</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <TableSearch placeholder="টোকেন, নাম বা ফোন নম্বর দিয়ে খুঁজুন" />
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">কোনো অর্ডার পাওয়া যায়নি।</p>
              ) : (
                <OrdersTable rows={rows} shopName={shop.name} deviceName={deviceName} />
              )}
              <TablePagination page={list.page} total={total} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
