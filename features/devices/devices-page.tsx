import { Suspense } from "react"
import { DownloadIcon, PrinterIcon } from "lucide-react"
import { LiveRefresh } from "@/components/live-refresh"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { AGENT_DOWNLOAD_URL } from "@/lib/constants"
import { env } from "@/lib/env"
import { AgentCard } from "./components/agent-card"
import { DeviceLicenseCard } from "./components/device-license-card"
import { NoAgentsCard } from "./components/no-agents-card"
import { PairPcButton } from "./components/pair-pc-button"
import { getShopDevices } from "./queries"

/** /dashboard/devices: the shop's PCs (print agents) and their printers. */
export function DevicesPage() {
  return (
    <>
      <PageHeader
        title="ডিভাইস"
        description="দোকানের কম্পিউটার ও প্রিন্টার/ফটোকপি মেশিন যুক্ত করুন।"
        icon={PrinterIcon}
        tone="emerald"
      >
        <Button variant="outline" nativeButton={false} render={<a href={AGENT_DOWNLOAD_URL} download />}>
          <DownloadIcon /> এজেন্ট ডাউনলোড
        </Button>
        <PairPcButton />
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Devices />
      </Suspense>
    </>
  )
}

async function Devices() {
  const { shop } = await requireShop()
  const { agents, enabledCount } = await getShopDevices(shop._id)

  if (agents.length === 0) return <NoAgentsCard />

  return (
    <>
      <LiveRefresh intervalMs={10_000} />
      <DeviceLicenseCard deviceLimit={shop.deviceLimit} enabledCount={enabledCount} deviceFee={env.deviceMonthlyFee} />
      {agents.map((entry) => (
        <AgentCard key={entry.agent.id} {...entry} />
      ))}
    </>
  )
}
