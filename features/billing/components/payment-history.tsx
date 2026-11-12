import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/table-pagination"
import { TableSearch } from "@/components/table-search"
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
import type { BillingPayment } from "../queries"

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  pending: "border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "border-0 bg-destructive/10 text-destructive",
  cancelled: "border-0 bg-muted text-muted-foreground",
  rejected: "border-0 bg-destructive/10 text-destructive",
}

/** One page of the shop's payments, searchable by TrxID or sender number. */
export function PaymentHistory({ payments, total, q, page }: { payments: BillingPayment[]; total: number; q: string; page: number }) {
  if (total === 0 && !q && page === 1) {
    return <p className="py-8 text-center text-sm text-muted-foreground">এখনো কোনো পেমেন্ট নেই।</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <TableSearch placeholder="TrxID বা নম্বর দিয়ে খুঁজুন" />
      {payments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">কোনো পেমেন্ট পাওয়া যায়নি।</p>
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
            {payments.map((p) => {
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
      <TablePagination page={page} total={total} />
    </div>
  )
}
