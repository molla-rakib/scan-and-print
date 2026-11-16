import Link from "next/link"
import { CreditCardIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { monthlyFee } from "@/lib/billing"
import { formatDate, formatNumber, formatTaka } from "@/lib/constants"
import { env } from "@/lib/env"
import { expiresSoon } from "@/lib/jobs"
import type { ShopDoc } from "@/lib/models"

/** Device limit, monthly fee and end of the paid period, with a link to renew. */
export function SubscriptionCard({ shop, enabledCount }: { shop: ShopDoc; enabledCount: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconTile icon={CreditCardIcon} tone="emerald" variant="soft" />
          <div>
            <CardTitle>সাবস্ক্রিপশন</CardTitle>
            <CardDescription>ডিভাইস প্রতি মাসে {formatTaka(env.deviceMonthlyFee)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">চালু ডিভাইস</span>
          <span className="font-medium tabular-nums">
            {formatNumber(enabledCount)} / {formatNumber(shop.deviceLimit)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">মাসিক ফি</span>
          <span className="font-medium tabular-nums">{formatTaka(monthlyFee(shop))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">মেয়াদ শেষ</span>
          <span className="font-medium">{formatDate(shop.paidUntil)}</span>
        </div>
        <Button
          className="mt-2"
          variant={expiresSoon(shop) ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/dashboard/billing" />}
        >
          মেয়াদ বাড়ান
        </Button>
      </CardContent>
    </Card>
  )
}
