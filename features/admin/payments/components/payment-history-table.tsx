import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  SUBSCRIPTION_METHOD_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  formatDateTime,
  formatNumber,
  formatTaka,
  type SubscriptionMethod,
  type SubscriptionStatus,
} from "@/lib/constants"
import type { PaymentRow } from "../queries"
import { period } from "../period"

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  pending: "border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "border-0 bg-destructive/10 text-destructive",
  cancelled: "border-0 bg-muted text-muted-foreground",
  rejected: "border-0 bg-destructive/10 text-destructive",
}

/** Every subscription payment except abandoned gateway attempts, with its status and who recorded it. */
export function PaymentHistoryTable({ rows, shopName }: { rows: PaymentRow[]; shopName: (id: unknown) => string }) {
  return (
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
        {rows.map((p) => {
          const status = (p.status ?? "paid") as SubscriptionStatus
          return (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{shopName(p.shopId)}</TableCell>
              <TableCell className="tabular-nums">{formatTaka(p.amount)}</TableCell>
              <TableCell>{period(p.days)}{p.devices ? ` · ${formatNumber(p.devices)}টি ডিভাইস` : ""}</TableCell>
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
  )
}
