import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { activeDiscount, baseMonthlyFee, monthlyFee } from "@/lib/billing"
import { formatDate, formatNumber, formatTaka } from "@/lib/constants"
import { subscriptionExpired } from "@/lib/jobs"
import type { ShopDoc } from "@/lib/models"
import { ShopActions } from "./shop-actions"

export type ShopRow = { shop: ShopDoc; ownerEmail: string; enabledDevices: number; monthlyJobs: number }

/** The admin's shops table: one row per shop with its owner, devices, fee, recent orders, end date and actions. */
export function ShopsTable({ rows }: { rows: ShopRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>দোকান</TableHead>
          <TableHead>মালিক</TableHead>
          <TableHead>ডিভাইস</TableHead>
          <TableHead>মাসিক ফি</TableHead>
          <TableHead>৩০ দিনের অর্ডার</TableHead>
          <TableHead>মেয়াদ</TableHead>
          <TableHead>অবস্থা</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ shop, ownerEmail, enabledDevices, monthlyJobs }) => {
          const expired = subscriptionExpired(shop)
          return (
            <TableRow key={shop.id}>
              <TableCell>
                <div className="font-medium">{shop.name}</div>
                <div className="text-xs text-muted-foreground">/s/{shop.slug}</div>
              </TableCell>
              <TableCell className="text-muted-foreground">{ownerEmail}</TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(enabledDevices)} / {formatNumber(shop.deviceLimit)}
              </TableCell>
              <TableCell className="tabular-nums">
                {(() => {
                  const discount = activeDiscount(shop)
                  if (!discount) return formatTaka(baseMonthlyFee(shop))
                  return (
                    <div className="flex flex-col">
                      <span>
                        <span className="font-medium">{formatTaka(monthlyFee(shop))}</span>{" "}
                        <span className="text-xs text-muted-foreground line-through">{formatTaka(baseMonthlyFee(shop))}</span>
                      </span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">
                        {discount.kind === "percent" ? `${formatNumber(discount.value)}% ছাড়` : "নির্দিষ্ট ফি"}
                        {discount.until && ` · ${formatDate(discount.until)} পর্যন্ত`}
                      </span>
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell className="tabular-nums">{formatNumber(monthlyJobs)}</TableCell>
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
                  shop={{
                    id: shop.id,
                    name: shop.name,
                    slug: shop.slug,
                    deviceLimit: shop.deviceLimit,
                    suspended: shop.status === "suspended",
                    baseFee: baseMonthlyFee(shop),
                    monthlyFee: monthlyFee(shop),
                    discount: shop.discount?.kind
                      ? {
                          kind: shop.discount.kind as "percent" | "fixed",
                          value: shop.discount.value,
                          // The date input wants YYYY-MM-DD in Dhaka time.
                          until: shop.discount.until ? new Date(shop.discount.until.getTime() + 6 * 3600_000).toISOString().slice(0, 10) : "",
                          note: shop.discount.note ?? "",
                        }
                      : null,
                  }}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
