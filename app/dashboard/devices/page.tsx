import type { Metadata } from "next"
import { Suspense } from "react"
import { KeyRoundIcon, MonitorIcon, PrinterIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { LiveRefresh } from "@/components/live-refresh"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireShop } from "@/lib/auth"
import { formatDateTime, formatNumber, formatTaka } from "@/lib/constants"
import { env } from "@/lib/env"
import { onlineCutoff } from "@/lib/jobs"
import { Agent, Device } from "@/lib/models"
import { cn } from "@/lib/utils"
import { DeviceControls, PairPcButton, RemoveAgentButton } from "./device-controls"

export const metadata: Metadata = { title: "ডিভাইস" }

export default function DevicesPage() {
  return (
    <>
      <PageHeader
        title="ডিভাইস"
        description="দোকানের কম্পিউটার ও প্রিন্টার/ফটোকপি মেশিন যুক্ত করুন।"
        icon={PrinterIcon}
        tone="emerald"
      >
        <PairPcButton />
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Devices />
      </Suspense>
    </>
  )
}

function StatusDot({ online, label }: { online: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs sm:text-sm">
      <span className={cn("size-2 rounded-full", online ? "bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20" : "bg-muted-foreground/40")} />
      {label}
    </span>
  )
}

async function Devices() {
  const { shop } = await requireShop()
  const [agents, devices] = await Promise.all([
    Agent.find({ shopId: shop._id, tokenHash: { $exists: true } }).sort({ pairedAt: 1 }),
    Device.find({ shopId: shop._id }).sort({ createdAt: 1 }),
  ])
  const cutoff = onlineCutoff()
  const isOnline = (agentId: unknown) => {
    const agent = agents.find((a) => a._id.equals(agentId as string))
    return Boolean(agent?.lastSeenAt && agent.lastSeenAt >= cutoff)
  }
  const enabledCount = devices.filter((d) => d.enabled).length

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MonitorIcon />
              </EmptyMedia>
              <EmptyTitle>এখনো কোনো কম্পিউটার যুক্ত হয়নি</EmptyTitle>
              <EmptyDescription>
                যে কম্পিউটারে আপনার প্রিন্টারগুলো ইনস্টল করা আছে, সেখানে প্রিন্ট এজেন্ট ইনস্টল করুন। তারপর &quot;কম্পিউটার যুক্ত
                করুন&quot; চাপে কোডটি এজেন্টে দিন।
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <PairPcButton />
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <LiveRefresh intervalMs={10_000} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={KeyRoundIcon} tone="amber" variant="soft" />
            <CardTitle>ডিভাইস লাইসেন্স</CardTitle>
          </div>
          <CardDescription>
            শুধু চালু করা প্রিন্টারে অর্ডার যায়। প্রতিটি চালু ডিভাইসের জন্য মাসে {formatTaka(env.deviceMonthlyFee)}।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={Math.min(100, (enabledCount / Math.max(1, shop.deviceLimit)) * 100)}>
            <span className="text-sm">
              {formatNumber(shop.deviceLimit)}টির মধ্যে {formatNumber(enabledCount)}টি ডিভাইস চালু
            </span>
          </Progress>
        </CardContent>
      </Card>

      {agents.map((agent) => {
        const agentDevices = devices.filter((d) => d.agentId.equals(agent._id))
        const online = isOnline(agent._id)
        return (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <IconTile icon={MonitorIcon} tone={online ? "blue" : "sky"} variant={online ? "solid" : "soft"} />
                <div className="min-w-0">
                  <CardTitle className="truncate">{agent.machineName || "দোকানের কম্পিউটার"}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusDot online={online} label={online ? "অনলাইন" : "অফলাইন"} />
                    {agent.lastSeenAt && <span>শেষ সংযোগ: {formatDateTime(agent.lastSeenAt)}</span>}
                    {agent.version && <span className="hidden sm:inline">এজেন্ট v{agent.version}</span>}
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <RemoveAgentButton agentId={agent.id} name={agent.machineName || "দোকানের কম্পিউটার"} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {agentDevices.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  এই কম্পিউটারে কোনো প্রিন্টার পাওয়া যায়নি। Windows-এ প্রিন্টার ইনস্টল করা আছে কিনা দেখুন।
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্রিন্টার</TableHead>
                      <TableHead className="hidden md:table-cell">অবস্থা</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead className="text-right">চালু</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentDevices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <IconTile
                              icon={PrinterIcon}
                              tone={device.color ? "violet" : "sky"}
                              variant="soft"
                              className="size-8"
                            />
                            <div className="min-w-0">
                              <div className="max-w-36 truncate font-medium sm:max-w-none">{device.name}</div>
                              {device.name !== device.systemName && (
                                <div className="max-w-36 truncate text-xs text-muted-foreground sm:max-w-none">{device.systemName}</div>
                              )}
                              <div className="md:hidden">
                                {!device.present ? (
                                  <span className="text-xs text-muted-foreground">পাওয়া যাচ্ছে না</span>
                                ) : (
                                  <StatusDot online={online} label={online ? "প্রস্তুত" : "অফলাইন"} />
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {!device.present ? (
                            <Badge variant="outline">পাওয়া যাচ্ছে না</Badge>
                          ) : (
                            <StatusDot online={online} label={online ? "প্রস্তুত" : "অফলাইন"} />
                          )}
                        </TableCell>
                        <DeviceControls
                          device={{ id: device.id, name: device.name, color: device.color, enabled: device.enabled }}
                        />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )
      })}
    </>
  )
}
