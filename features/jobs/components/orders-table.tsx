import { JobStatusBadge } from "@/components/job-status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { env } from "@/lib/env"
import type { OrderRow } from "../queries"
import { FileActionsMenu } from "./file-actions-menu"
import { OrderActions } from "./order-actions"

/** The shop's orders, one row per order with its files listed inside. */
export function OrdersTable({
  rows,
  shopName,
  deviceName,
}: {
  rows: OrderRow[]
  shopName: string
  deviceName: (id: unknown) => string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>টোকেন</TableHead>
          <TableHead>ফাইল</TableHead>
          <TableHead className="hidden sm:table-cell">পেমেন্ট</TableHead>
          <TableHead className="hidden xl:table-cell">সময়</TableHead>
          <TableHead className="hidden md:table-cell">অবস্থা</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">অপশন</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ order, files, status }) => {
          const customer = [order.customer?.name, order.customer?.phone].filter(Boolean)
          return (
            <TableRow key={order.id} className="align-top">
              <TableCell className="font-semibold text-primary">{formatToken(order.token)}</TableCell>
              <TableCell className="max-w-56 whitespace-normal sm:max-w-80 lg:max-w-none">
                <ul className="flex flex-col gap-3">
                  {files.map((job) => (
                    <li key={job.id}>
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
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <FileActionsMenu
                    files={files.map((job) => ({
                      id: job.id,
                      name: job.fileName,
                      status: job.status as JobStatus,
                      canReprint: !job.fileDeleted,
                    }))}
                  />
                  <OrderActions
                    orderId={order.id}
                    deletable={!files.some((job) => ["queued", "printing", "awaiting_approval"].includes(job.status))}
                    url={`${env.appUrl}/j/${order.publicId}`}
                    token={order.token}
                    shopName={shopName}
                    customerPhone={order.customer?.phone}
                  />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
