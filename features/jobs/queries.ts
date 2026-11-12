import "server-only"
import type { Types } from "mongoose"
import { containsRegex, type ListParams } from "@/lib/list-params"
import { expireStaleJobs, latestCashOrder, orderStatus } from "@/lib/jobs"
import { Device, Order, PrintJob } from "@/lib/models"

/** Bangla digits (০-৯) to ASCII, so "১২" finds token 12 and "০১৭…" finds a stored phone number. */
function asciiDigits(text: string) {
  return text.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
}

/**
 * The search box matches the order's token (the exact number, with or without "#"), or contains-matches the
 * customer's name or phone number. Case-insensitive; Bangla and English digits both work.
 */
function searchFilter(q: string) {
  if (!q) return {}
  const ascii = asciiDigits(q)
  const token = ascii.replace(/^#\s*/, "")
  return {
    $or: [
      { "customer.name": containsRegex(q) },
      { "customer.phone": containsRegex(ascii) },
      ...(/^\d{1,9}$/.test(token) ? [{ token: Number(token) }] : []),
    ],
  }
}

/** One page of the shop's orders (newest first) with their files, plus what the order list needs around it. */
export async function loadOrders(shopId: Types.ObjectId, { q, skip, limit }: ListParams) {
  await expireStaleJobs({ shopId })
  const filter = { shopId, status: { $ne: "draft" as const }, ...searchFilter(q) }
  const [latestCash, orders, total, devices] = await Promise.all([
    latestCashOrder(shopId),
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
    Device.find({ shopId }).select("name"),
  ])
  const jobs = await PrintJob.find({ orderId: { $in: orders.map((o) => o._id) } }).sort({ createdAt: 1 })
  const jobsOf = (orderId: unknown) => jobs.filter((job) => job.orderId.equals(orderId as string))
  const deviceName = (id: unknown) => devices.find((d) => d._id.equals(id as string))?.name ?? "—"

  const rows = orders.map((order) => {
    const files = jobsOf(order._id)
    return { order, files, status: orderStatus(order, files) }
  })
  return { latestCash, rows, total, deviceName }
}

export type OrderRow = Awaited<ReturnType<typeof loadOrders>>["rows"][number]
