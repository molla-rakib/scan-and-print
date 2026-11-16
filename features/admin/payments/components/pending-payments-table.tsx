import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SUBSCRIPTION_METHOD_LABELS, formatDateTime, formatNumber, formatTaka, type SubscriptionMethod } from "@/lib/constants"
import type { PaymentRow } from "../queries"
import { period } from "../period"
import { PaymentReview } from "./payment-review"

/** Manual bKash/Nagad payments waiting for the admin, each with Approve / Reject. */
export function PendingPaymentsTable({ rows, shopName }: { rows: PaymentRow[]; shopName: (id: unknown) => string }) {
  return (
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
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <div className="font-medium">{shopName(p.shopId)}</div>
              <div className="text-xs text-muted-foreground">{period(p.days)}{p.devices ? ` · ${formatNumber(p.devices)}টি ডিভাইস` : ""}</div>
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
  )
}
