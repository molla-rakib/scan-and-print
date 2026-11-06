import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import {
  BanknoteIcon,
  CheckCircle2Icon,
  CircleIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  PrinterIcon,
  RocketIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { JobStatusBadge } from "@/components/job-status-badge"
import { LiveRefresh } from "@/components/live-refresh"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireShop } from "@/lib/auth"
import {
  COLOR_MODE_LABELS,
  formatDate,
  formatNumber,
  formatTaka,
  formatToken,
  type ColorMode,
  type JobStatus,
} from "@/lib/constants"
import { env } from "@/lib/env"
import { availableDevices, latestCashOrder, paymentOptions, shopIsOpen } from "@/lib/jobs"
import { Agent, Device, PrintJob } from "@/lib/models"

export const metadata: Metadata = { title: "সারসংক্ষেপ" }

export default function OverviewPage() {
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

function startOfTodayInDhaka() {
  const now = new Date()
  const dhaka = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }))
  return new Date(now.getTime() - (dhaka.getHours() * 3600 + dhaka.getMinutes() * 60 + dhaka.getSeconds()) * 1000)
}

async function Overview() {
  const { shop } = await requireShop()
  const today = startOfTodayInDhaka()

  const [todayStats, latestCash, online, enabledCount, pairedPcs, recentJobs] = await Promise.all([
    PrintJob.aggregate<{ count: number; revenue: number; cash: number }>([
      { $match: { shopId: shop._id, queuedAt: { $gte: today }, status: { $nin: ["cancelled", "draft"] } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: "$amount" },
          cash: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$amount", 0] } },
        },
      },
    ]),
    latestCashOrder(shop._id),
    availableDevices(shop._id),
    Device.countDocuments({ shopId: shop._id, enabled: true }),
    Agent.countDocuments({ shopId: shop._id, tokenHash: { $exists: true } }),
    PrintJob.find({ shopId: shop._id, status: { $ne: "draft" } }).sort({ createdAt: -1 }).limit(6),
  ])

  const payments = paymentOptions(shop)
  const checklist = [
    { done: pairedPcs > 0, label: "দোকানের কম্পিউটারে প্রিন্ট এজেন্ট ইনস্টল করে যুক্ত করুন", href: "/dashboard/devices" },
    { done: enabledCount > 0, label: "অন্তত একটি প্রিন্টার চালু করুন", href: "/dashboard/devices" },
    { done: payments.bkash || payments.cash, label: "পেমেন্ট পদ্ধতি ঠিক করুন (বিকাশ বা ক্যাশ)", href: "/dashboard/settings" },
    { done: false, label: "QR কোড প্রিন্ট করে কাউন্টারে লাগান", href: "/dashboard/qr" },
  ]
  const setupComplete = checklist.slice(0, 3).every((item) => item.done)
  const doneCount = checklist.filter((item) => item.done).length

  return (
    <>
      <LiveRefresh latestCash={latestCash} />

      {!shopIsOpen(shop) && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>আপনার দোকান এখন অর্ডার নিচ্ছে না</AlertTitle>
          <AlertDescription>
            {shop.status === "suspended"
              ? "আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ রাখা হয়েছে। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।"
              : "আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হয়ে গেছে। চালু রাখতে নবায়ন করুন।"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="আজকের অর্ডার" value={formatNumber(todayStats[0]?.count ?? 0)} icon={ListOrderedIcon} tone="blue" />
        <StatCard label="আজকের আয়" value={formatTaka(todayStats[0]?.revenue ?? 0)} icon={TrendingUpIcon} tone="emerald" />
        <StatCard
          label="অনলাইন প্রিন্টার"
          value={`${formatNumber(online.length)} / ${formatNumber(enabledCount)}`}
          icon={PrinterIcon}
          tone="violet"
          href="/dashboard/devices"
        />
        <StatCard
          label="আজ ক্যাশে নিতে হবে"
          value={formatTaka(todayStats[0]?.cash ?? 0)}
          icon={BanknoteIcon}
          tone="amber"
          href="/dashboard/jobs"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <IconTile icon={ListOrderedIcon} tone="violet" variant="soft" />
              <CardTitle>সাম্প্রতিক অর্ডার</CardTitle>
            </div>
            <CardAction>
              <Button variant="outline" size="sm" render={<Link href="/dashboard/jobs" />} nativeButton={false}>
                সব দেখুন
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">এখনো কোনো অর্ডার আসেনি।</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>টোকেন</TableHead>
                    <TableHead>ফাইল</TableHead>
                    <TableHead className="hidden sm:table-cell">ধরন</TableHead>
                    <TableHead className="text-right">মূল্য</TableHead>
                    <TableHead className="hidden sm:table-cell">অবস্থা</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-semibold text-primary">{formatToken(job.token)}</TableCell>
                      <TableCell className="max-w-40 sm:max-w-64">
                        <div className="truncate">{job.fileName}</div>
                        <div className="mt-1 sm:hidden">
                          <JobStatusBadge status={job.status as JobStatus} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{COLOR_MODE_LABELS[job.colorMode as ColorMode]}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatTaka(job.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <JobStatusBadge status={job.status as JobStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {!setupComplete && (
            <Card className="relative overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/12 via-violet-500/8 to-transparent" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <IconTile icon={RocketIcon} tone="blue" />
                  <div>
                    <CardTitle>শুরু করার ধাপ</CardTitle>
                    <CardDescription>অর্ডার নেওয়া শুরু করতে এগুলো শেষ করুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-col gap-4">
                <Progress value={(doneCount / checklist.length) * 100}>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(checklist.length)}টির মধ্যে {formatNumber(doneCount)}টি সম্পন্ন
                  </span>
                </Progress>
                <div className="flex flex-col gap-3">
                  {checklist.map((item) => (
                    <Link key={item.label} href={item.href} className="flex items-start gap-2 text-sm hover:text-primary">
                      {item.done ? (
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                <span className="font-medium tabular-nums">{formatTaka(shop.deviceLimit * env.deviceMonthlyFee)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">মেয়াদ শেষ</span>
                <span className="font-medium">{formatDate(shop.paidUntil)}</span>
              </div>
            </CardContent>
          </Card>
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
