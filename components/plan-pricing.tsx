import { BILLING_MONTHS, BILLING_MONTH_DISCOUNTS, billingAmount, formatNumber, formatTaka } from "@/lib/constants"
import { cn } from "@/lib/utils"

/** What `devices` devices cost for each plan length, with the multi-month discounts. */
export function PlanPricing({ deviceFee, devices, className }: { deviceFee: number; devices: number; className?: string }) {
  const monthly = deviceFee * Math.max(devices, 1)
  return (
    <div className={cn("divide-y rounded-lg border text-sm", className)}>
      {BILLING_MONTHS.map((months) => {
        const percent = BILLING_MONTH_DISCOUNTS[months]
        const full = monthly * months
        const total = billingAmount(monthly, months)
        return (
          <div key={months} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{formatNumber(months)} মাস</span>
              {percent > 0 && (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatNumber(percent)}% ছাড়
                </span>
              )}
            </span>
            <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums">
              {percent > 0 && <span className="text-xs text-muted-foreground line-through">{formatTaka(full)}</span>}
              <span className="font-semibold">{formatTaka(total)}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
