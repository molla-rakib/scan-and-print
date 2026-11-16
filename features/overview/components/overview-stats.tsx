import { BanknoteIcon, ListOrderedIcon, PrinterIcon, TrendingUpIcon } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { formatNumber, formatTaka } from "@/lib/constants"

/** Today's orders, revenue and cash to collect, plus how many printers are online. */
export function OverviewStats({
  today,
  onlineCount,
  enabledCount,
}: {
  today: { count: number; revenue: number; cash: number }
  onlineCount: number
  enabledCount: number
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="আজকের অর্ডার" value={formatNumber(today.count)} icon={ListOrderedIcon} tone="blue" />
      <StatCard label="আজকের আয়" value={formatTaka(today.revenue)} icon={TrendingUpIcon} tone="emerald" />
      <StatCard
        label="অনলাইন প্রিন্টার"
        value={`${formatNumber(onlineCount)} / ${formatNumber(enabledCount)}`}
        icon={PrinterIcon}
        tone="violet"
        href="/dashboard/devices"
      />
      <StatCard
        label="আজ ক্যাশে নিতে হবে"
        value={formatTaka(today.cash)}
        icon={BanknoteIcon}
        tone="amber"
        href="/dashboard/jobs"
      />
    </div>
  )
}
