import type { Metadata } from "next"
import { Suspense } from "react"
import { BanknoteIcon, InboxIcon, ListOrderedIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { JobStatusBadge } from "@/components/job-status-badge"
import { LiveRefresh } from "@/components/live-refresh"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireShop } from "@/lib/auth"
import {
  COLOR_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDateTime,
  formatNumber,
  formatTaka,
  formatToken,
  type ColorMode,
  type JobStatus,
  type PaymentMethod,
} from "@/lib/constants"
import { Device, PrintJob } from "@/lib/models"
import { ApprovalButtons, JobActions } from "./job-actions"

export const metadata: Metadata = { title: "প্রিন্ট অর্ডার" }

export default function JobsPage() {
  return (
    <>
      <PageHeader
        title="প্রিন্ট অর্ডার"
        description="নতুন অর্ডার স্বয়ংক্রিয়ভাবে এখানে দেখা যাবে।"
        icon={ListOrderedIcon}
        tone="violet"
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Jobs />
      </Suspense>
    </>
  )
}

async function Jobs() {
  const { shop } = await requireShop()
  const [approvals, jobs, devices] = await Promise.all([
    PrintJob.find({ shopId: shop._id, status: "awaiting_approval" }).sort({ createdAt: 1 }),
    PrintJob.find({ shopId: shop._id, status: { $nin: ["draft", "awaiting_approval"] } })
      .sort({ createdAt: -1 })
      .limit(100),
    Device.find({ shopId: shop._id }).select("name"),
  ])
  const deviceName = (id: unknown) => devices.find((d) => d._id.equals(id as string))?.name ?? "—"

  return (
    <>
      <LiveRefresh pendingApprovals={approvals.length} />

      {approvals.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-medium">
            <span className="size-2 animate-pulse rounded-full bg-amber-500" />
            ক্যাশ অর্ডার — টাকা নিয়ে অনুমোদন দিন
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {approvals.map((job) => (
              <Card key={job.id} className="relative overflow-hidden ring-amber-500/50">
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-500/12 to-transparent" />
                <CardHeader className="relative">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile icon={BanknoteIcon} tone="amber" />
                    <div className="min-w-0">
                      <CardTitle className="text-lg">টোকেন {formatToken(job.token)}</CardTitle>
                      <CardDescription className="truncate">{job.fileName}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">পৃষ্ঠা × কপি</div>
                      <div className="font-medium">
                        {formatNumber(job.pageCount)} × {formatNumber(job.copies)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">ধরন</div>
                      <div className="font-medium">{COLOR_MODE_LABELS[job.colorMode as ColorMode]}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">নিতে হবে</div>
                      <div className="text-base font-semibold">{formatTaka(job.amount)}</div>
                    </div>
                  </div>
                  <ApprovalButtons jobId={job.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={ListOrderedIcon} tone="violet" variant="soft" />
            <div>
              <CardTitle>সব অর্ডার</CardTitle>
              <CardDescription>সর্বশেষ ১০০টি অর্ডার</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>এখনো কোনো অর্ডার নেই</EmptyTitle>
                <EmptyDescription>গ্রাহক QR কোড স্ক্যান করে অর্ডার দিলে এখানে দেখা যাবে।</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>টোকেন</TableHead>
                  <TableHead>ফাইল</TableHead>
                  <TableHead className="hidden lg:table-cell">বিবরণ</TableHead>
                  <TableHead className="hidden xl:table-cell">প্রিন্টার</TableHead>
                  <TableHead className="hidden sm:table-cell">পেমেন্ট</TableHead>
                  <TableHead className="hidden xl:table-cell">সময়</TableHead>
                  <TableHead className="hidden md:table-cell">অবস্থা</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="align-top font-semibold text-primary">{formatToken(job.token)}</TableCell>
                    <TableCell className="max-w-44 sm:max-w-64">
                      <div className="truncate font-medium">{job.fileName}</div>
                      <div className="truncate text-xs text-muted-foreground lg:hidden">
                        {formatNumber(job.pageCount)} পৃষ্ঠা × {formatNumber(job.copies)} কপি · {COLOR_MODE_LABELS[job.colorMode as ColorMode]}
                        <span className="sm:hidden"> · {formatTaka(job.amount)}</span>
                      </div>
                      {job.error && <div className="truncate text-xs text-destructive">{job.error}</div>}
                      <div className="mt-1 md:hidden">
                        <JobStatusBadge status={job.status as JobStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatNumber(job.pageCount)} পৃষ্ঠা × {formatNumber(job.copies)} কপি ·{" "}
                      {COLOR_MODE_LABELS[job.colorMode as ColorMode]}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{job.deviceId ? deviceName(job.deviceId) : "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="font-medium tabular-nums">{formatTaka(job.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {job.paymentMethod ? PAYMENT_METHOD_LABELS[job.paymentMethod as PaymentMethod] : "—"}
                        {job.bkash?.trxId && ` · ${job.bkash.trxId}`}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDateTime(job.createdAt)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <JobStatusBadge status={job.status as JobStatus} />
                    </TableCell>
                    <TableCell>
                      <JobActions jobId={job.id} status={job.status as JobStatus} canReprint={!job.fileDeleted} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
