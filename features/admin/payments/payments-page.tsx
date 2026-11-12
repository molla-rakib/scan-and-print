import { Suspense } from "react"
import { ClockIcon, ReceiptTextIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { TablePagination } from "@/components/table-pagination"
import { TableSearch } from "@/components/table-search"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireAdmin } from "@/lib/auth"
import { connectDb } from "@/lib/db"
import { readListParams } from "@/lib/list-params"
import { PaymentHistoryTable } from "./components/payment-history-table"
import { PendingPaymentsTable } from "./components/pending-payments-table"
import { loadPayments } from "./queries"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const SEARCH_PLACEHOLDER = "দোকানের নাম, TrxID বা পাঠানো নম্বর"

/** /dashboard/admin/payments: manual payments to approve (`?pq=&ppage=`) and the payment history (`?hq=&hpage=`). */
export function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Payments searchParams={searchParams} />
    </Suspense>
  )
}

async function Payments({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  await connectDb()
  const params = await searchParams
  const pendingList = readListParams(params, "p")
  const historyList = readListParams(params, "h")
  const { waiting, recent, shopName } = await loadPayments(pendingList, historyList)

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
        <CardContent className="flex flex-col gap-4">
          {waiting.total === 0 && !pendingList.q ? (
            <p className="py-6 text-center text-sm text-muted-foreground">কোনো পেমেন্ট অপেক্ষায় নেই।</p>
          ) : (
            <>
              <TableSearch prefix="p" placeholder={SEARCH_PLACEHOLDER} />
              {waiting.rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">কোনো পেমেন্ট মেলেনি।</p>
              ) : (
                <PendingPaymentsTable rows={waiting.rows} shopName={shopName} />
              )}
              <TablePagination prefix="p" page={pendingList.page} total={waiting.total} />
            </>
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
        <CardContent className="flex flex-col gap-4">
          {recent.total === 0 && !historyList.q ? (
            <p className="py-6 text-center text-sm text-muted-foreground">এখনো কোনো পেমেন্ট নেই।</p>
          ) : (
            <>
              <TableSearch prefix="h" placeholder={SEARCH_PLACEHOLDER} />
              {recent.rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">কোনো পেমেন্ট মেলেনি।</p>
              ) : (
                <PaymentHistoryTable rows={recent.rows} shopName={shopName} />
              )}
              <TablePagination prefix="h" page={historyList.page} total={recent.total} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
