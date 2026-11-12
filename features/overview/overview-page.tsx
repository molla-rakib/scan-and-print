import { Suspense } from "react"
import { LayoutDashboardIcon, TriangleAlertIcon } from "lucide-react"
import { LiveRefresh } from "@/components/live-refresh"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { OverviewStats } from "./components/overview-stats"
import { RecentOrders } from "./components/recent-orders"
import { SetupChecklist } from "./components/setup-checklist"
import { SubscriptionCard } from "./components/subscription-card"
import { loadOverview } from "./queries"

/** /dashboard: today's orders, revenue and printer status. */
export function OverviewPage() {
  return (
    <>
      <PageHeader
        title="সারসংক্ষেপ"
        description="আজকের অর্ডার, আয় এবং প্রিন্টারের অবস্থা।"
        icon={LayoutDashboardIcon}
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </>
  )
}

async function Overview() {
  const { shop } = await requireShop()
  const data = await loadOverview(shop)

  return (
    <>
      <LiveRefresh latestCash={data.latestCash} />

      {shop.status === "suspended" && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>আপনার দোকান এখন অর্ডার নিচ্ছে না</AlertTitle>
          <AlertDescription>আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ রাখা হয়েছে। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।</AlertDescription>
        </Alert>
      )}

      <OverviewStats today={data.today} onlineCount={data.onlineCount} enabledCount={data.enabledCount} />

      <div className="grid gap-6 xl:grid-cols-3">
        <RecentOrders jobs={data.recentJobs} />

        <div className="flex min-w-0 flex-col gap-6">
          <SetupChecklist pairedPcs={data.pairedPcs} enabledCount={data.enabledCount} paymentsReady={data.paymentsReady} />
          <SubscriptionCard shop={shop} enabledCount={data.enabledCount} />
        </div>
      </div>
    </>
  )
}

function OverviewSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-22" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </>
  )
}
