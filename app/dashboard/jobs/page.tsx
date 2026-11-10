import type { Metadata } from "next"
import { Suspense } from "react"
import { InboxIcon, ListOrderedIcon } from "lucide-react"
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
  PAPER_SIZE_LABELS,
  PAYMENT_METHOD_LABELS,
  SIDES_LABELS,
  formatPageSelection,
  formatDateTime,
  formatNumber,
  formatTaka,
  formatToken,
  type ColorMode,
  type JobStatus,
  type PaperSize,
  type PaymentMethod,
} from "@/lib/constants"
import { latestCashOrder, orderStatus } from "@/lib/jobs"
import { Device, Order, PrintJob } from "@/lib/models"
import { JobActions } from "./job-actions"

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
  const [latestCash, orders, devices] = await Promise.all([
    latestCashOrder(shop._id),
    Order.find({ shopId: shop._id, status: { $ne: "draft" } })
      .sort({ createdAt: -1 })
      .limit(100),
    Device.find({ shopId: shop._id }).select("name"),
  ])
  const jobs = await PrintJob.find({ orderId: { $in: orders.map((o) => o._id) } }).sort({ createdAt: 1 })
  const jobsOf = (orderId: unknown) => jobs.filter((job) => job.orderId.equals(orderId as string))
  const deviceName = (id: unknown) => devices.find((d) => d._id.equals(id as string))?.name ?? "—"

  return (
    <>
      <LiveRefresh latestCash={latestCash} />

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
          {orders.length === 0 ? (
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
                  <TableHead className="hidden sm:table-cell">পেমেন্ট</TableHead>
                  <TableHead className="hidden xl:table-cell">সময়</TableHead>
                  <TableHead className="hidden md:table-cell">অবস্থা</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const files = jobsOf(order._id)
                  const status = orderStatus(order, files)
                  const customer = [order.customer?.name, order.customer?.phone].filter(Boolean)
                  return (
                    <TableRow key={order.id} className="align-top">
                      <TableCell className="font-semibold text-primary">{formatToken(order.token)}</TableCell>
                      <TableCell className="max-w-56 whitespace-normal sm:max-w-80 lg:max-w-none">
                        <ul className="flex flex-col gap-3">
                          {files.map((job) => (
                            <li key={job.id} className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-medium">{job.fileName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {job.pages.length
                                    ? `পৃষ্ঠা ${formatPageSelection(job.pages, job.pageCount)}`
                                    : `${formatNumber(job.pageCount)} পৃষ্ঠা`}{" "}
                                  × {formatNumber(job.copies)} কপি · {COLOR_MODE_LABELS[job.colorMode as ColorMode]}
                                  {job.duplex && ` · ${SIDES_LABELS.both}`}
                                  {job.paperSize !== "A4" && ` · ${PAPER_SIZE_LABELS[job.paperSize as PaperSize]}`}
                                  {job.deviceId && <span className="hidden lg:inline"> · {deviceName(job.deviceId)}</span>}
                                </div>
                                {job.error && <div className="text-xs text-destructive">{job.error}</div>}
                                {files.length > 1 && (
                                  <div className="mt-1">
                                    <JobStatusBadge status={job.status as JobStatus} />
                                  </div>
                                )}
                              </div>
                              <JobActions jobId={job.id} status={job.status as JobStatus} canReprint={!job.fileDeleted} />
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-xs text-muted-foreground sm:hidden">
                          {formatTaka(order.amount)}
                          {order.paymentMethod && ` · ${PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}`}
                          {customer.length > 0 && ` · ${customer.join(" · ")}`}
                        </div>
                        <div className="mt-1 md:hidden">
                          <JobStatusBadge status={status} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="font-medium tabular-nums">{formatTaka(order.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] : "—"}
                          {order.bkash?.trxId && ` · ${order.bkash.trxId}`}
                        </div>
                        {customer.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {order.customer?.name}
                            {order.customer?.name && order.customer?.phone && " · "}
                            {order.customer?.phone && (
                              <a href={`tel:${order.customer.phone}`} className="hover:underline">
                                {order.customer.phone}
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDateTime(order.createdAt)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <JobStatusBadge status={status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
