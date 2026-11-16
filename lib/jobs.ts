import "server-only"
import type { Types } from "mongoose"
import {
  ACTIVE_JOB_STATUSES,
  AGENT_ONLINE_WINDOW_MS,
  EXTRA_PAPER_SIZES,
  MIN_AGENT_VERSION_FOR_OPTIONS,
  QUEUE_EXPIRY_HOURS,
  QUEUE_EXPIRY_MS,
  formatNumber,
  printerDuplexes,
  printerHasPaper,
  versionAtLeast,
  type JobStatus,
  type PaperPrices,
  type PaperSize,
  GRACE_DAYS,
  RENEW_NOTICE_DAYS,
} from "@/lib/constants"
import { Agent, Device, Order, PrintJob, Shop, type DeviceDoc, type OrderDoc, type PrintJobDoc, type ShopDoc } from "@/lib/models"
import { deleteFile } from "@/lib/storage"

type Id = Types.ObjectId | string

export function onlineCutoff() {
  return new Date(Date.now() - AGENT_ONLINE_WINDOW_MS)
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

/** Midnight on the 1st of the current month in Bangladesh time (UTC+6, no daylight saving). */
export function startOfMonthInDhaka() {
  const dhaka = new Date(Date.now() + 6 * 60 * 60 * 1000)
  return new Date(Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), 1) - 6 * 60 * 60 * 1000)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whether the paid period (or trial) has ended. Printing still works for GRACE_DAYS after this. */
export function subscriptionExpired(shop: ShopDoc) {
  return shop.paidUntil.getTime() <= Date.now()
}

/** Whether the subscription ends within RENEW_NOTICE_DAYS (or already ended), so the owner should renew. */
export function expiresSoon(shop: ShopDoc) {
  return shop.paidUntil.getTime() - Date.now() < RENEW_NOTICE_DAYS * DAY_MS
}

/** Whole days until the paid period (or trial) ends, rounded up; 0 once it has ended. */
export function daysLeft(shop: ShopDoc) {
  return Math.max(0, Math.ceil((shop.paidUntil.getTime() - Date.now()) / DAY_MS))
}

/** When printing stops: the end date plus the free grace days. */
export function serviceEndsAt(shop: ShopDoc) {
  return new Date(shop.paidUntil.getTime() + GRACE_DAYS * DAY_MS)
}

/** Whether customers can place orders at this shop right now (paid, or within the grace days). */
export function shopIsOpen(shop: ShopDoc) {
  return shop.status === "active" && serviceEndsAt(shop).getTime() > Date.now()
}

/**
 * The dashboard's subscription banner: "ending" (orange) in the last RENEW_NOTICE_DAYS, "grace" (red) during
 * the free days after the end date, "stopped" (red) once printing has stopped. `days` is whole days left.
 */
export function subscriptionNotice(shop: ShopDoc): { kind: "ending" | "grace" | "stopped"; days: number } | null {
  if (shop.status !== "active") return null
  const now = Date.now()
  const end = shop.paidUntil.getTime()
  const stop = end + GRACE_DAYS * DAY_MS
  if (now >= stop) return { kind: "stopped", days: 0 }
  if (now >= end) return { kind: "grace", days: Math.ceil((stop - now) / DAY_MS) }
  if (end - now <= RENEW_NOTICE_DAYS * DAY_MS) return { kind: "ending", days: Math.ceil((end - now) / DAY_MS) }
  return null
}

export function paymentOptions(shop: ShopDoc) {
  const bkashReady = Boolean(
    shop.bkash?.enabled && shop.bkash.username && shop.bkash.appKey && shop.bkash.passwordEnc && shop.bkash.appSecretEnc
  )
  return { bkash: bkashReady, cash: Boolean(shop.cash?.enabled) }
}

/** Customer details a cash order asks for. Falls back to the phone if a shop somehow has both off. */
export function cashFields(shop: ShopDoc) {
  const name = shop.cash?.askName ?? true
  const phone = shop.cash?.askPhone ?? true
  return { name, phone: phone || !name }
}

export type CashFields = ReturnType<typeof cashFields>

type StoredPrices = { bw?: number | null; color?: number | null; bwSheet?: number | null; colorSheet?: number | null }

/** One side's prices plus the both-sides sheet prices, which default to the one-side prices. */
function withSheetPrices(size: PaperSize, p: StoredPrices): PaperPrices {
  const bw = p.bw ?? 0
  const color = p.color ?? 0
  return { size, bw, color, bwSheet: p.bwSheet ?? bw, colorSheet: p.colorSheet ?? color }
}

/** Paper sizes the shop offers, A4 first, with prices per page (one side) and per sheet (both sides). */
export function paperOptions(shop: ShopDoc): PaperPrices[] {
  const options = [withSheetPrices("A4", shop.pricing ?? {})]
  for (const size of EXTRA_PAPER_SIZES) {
    const paper = shop.paperSizes?.[size]
    if (paper?.enabled) options.push(withSheetPrices(size, paper))
  }
  return options
}

/** Whether the shop allows color printing on both sides (off by default). */
export function colorDuplexAllowed(shop: ShopDoc) {
  return shop.pricing?.colorDuplex ?? false
}

/** The prices of a paper size, or null if the shop doesn't offer it. */
export function paperPrices(shop: ShopDoc, size: PaperSize) {
  return paperOptions(shop).find((o) => o.size === size) ?? null
}

/** Enabled printers whose shop PC is currently online, with the agent's version. */
export async function availableDevices(shopId: Id) {
  const agents = await Agent.find({ shopId, lastSeenAt: { $gte: onlineCutoff() } }).select("_id version")
  if (!agents.length) return []
  const devices = await Device.find({ shopId, enabled: true, present: true, agentId: { $in: agents.map((a) => a._id) } })
  const version = new Map(agents.map((a) => [a.id as string, a.version ?? ""]))
  return devices.map((device) => Object.assign(device, { agentVersion: version.get(String(device.agentId)) ?? "" }))
}

type JobNeeds = Pick<PrintJobDoc, "colorMode" | "duplex" | "paperSize" | "pages">

/** Whether a device can print a job exactly as ordered. */
export function deviceCanPrint(device: DeviceDoc & { agentVersion: string }, job: JobNeeds) {
  if (job.colorMode === "color" && !device.color) return false
  const size = (job.paperSize ?? "A4") as PaperSize
  if (!printerHasPaper(device, size)) return false
  if (job.duplex && !printerDuplexes(device, size)) return false
  const needsOptions = job.duplex || size !== "A4" || (job.pages?.length ?? 0) > 0
  return !needsOptions || versionAtLeast(device.agentVersion, MIN_AGENT_VERSION_FOR_OPTIONS)
}

export async function nextToken(shopId: Id) {
  const shop = await Shop.findByIdAndUpdate(shopId, { $inc: { tokenSeq: 1 } }, { returnDocument: "after" })
  if (!shop) throw new Error("Shop not found")
  // Short numbers are easier to call out at the counter.
  return ((shop.tokenSeq - 1) % 999) + 1
}

/**
 * Picks the best device for a job: it must support the job's color, sides and paper size; black & white
 * jobs prefer mono devices (cheaper per page) unless those are much busier.
 */
export async function pickDevice(shopId: Id, job: JobNeeds) {
  const devices = (await availableDevices(shopId)).filter((d) => deviceCanPrint(d, job))
  if (!devices.length) return null

  const loads = await PrintJob.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { deviceId: { $in: devices.map((d) => d._id) }, status: { $in: ACTIVE_JOB_STATUSES } } },
    { $group: { _id: "$deviceId", count: { $sum: 1 } } },
  ])
  const loadOf = (d: DeviceDoc) => loads.find((l) => l._id.equals(d._id))?.count ?? 0
  const score = (d: DeviceDoc) => loadOf(d) + (job.colorMode === "bw" && d.color ? 2 : 0)

  return devices.sort((a, b) => score(a) - score(b))[0]
}

/** Moves a paid job into the print queue and routes it to a device. */
export async function queueJob(jobId: Id, from: JobStatus[], extra: Record<string, unknown> = {}) {
  const job = await PrintJob.findOneAndUpdate(
    { _id: jobId, status: { $in: from } },
    { $set: { status: "queued", queuedAt: new Date(), ...extra }, $unset: { draftExpiresAt: 1 } },
    { returnDocument: "after" }
  )
  if (!job) return null
  await assignDevice(job)
  return job
}

/**
 * Marks a paid (or cash) order as placed and queues all its files. Atomic on the order, so a repeated
 * bKash callback can't queue twice. Returns null if the order was not in one of the `from` states.
 */
export async function placeOrder(orderId: Id, from: ("draft" | "pending_payment")[], extra: Record<string, unknown> = {}) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: from } },
    { $set: { status: "placed", placedAt: new Date(), ...extra }, $unset: { draftExpiresAt: 1 } },
    { returnDocument: "after" }
  )
  if (!order) return null
  const jobs = await PrintJob.find({ orderId: order._id, status: { $in: ["draft", "pending_payment"] } }).sort({ createdAt: 1 })
  for (const job of jobs) await queueJob(job._id, ["draft", "pending_payment"])
  return order
}

export async function assignDevice(job: PrintJobDoc) {
  const device = await pickDevice(job.shopId, job)
  job.deviceId = device?._id
  job.agentId = device?.agentId
  await PrintJob.updateOne({ _id: job._id, status: "queued" }, { $set: { deviceId: device?._id ?? null, agentId: device?.agentId ?? null } })
  return device
}

/** Re-routes queued jobs that have no device, or whose device went offline or was disabled. */
export async function rebalanceQueue(shopId: Id) {
  const usable = (await availableDevices(shopId)).map((d) => d._id)
  const stuck = await PrintJob.find({ shopId, status: "queued", deviceId: { $nin: usable } }).sort({ queuedAt: 1 })
  for (const job of stuck) await assignDevice(job)
}

export async function queuePosition(job: PrintJobDoc) {
  if (job.status !== "queued" || !job.queuedAt) return null
  const ahead = await PrintJob.countDocuments({
    shopId: job.shopId,
    deviceId: job.deviceId ?? null,
    status: { $in: ACTIVE_JOB_STATUSES },
    queuedAt: { $lt: job.queuedAt },
  })
  return ahead + 1
}

export async function discardJobFile(job: PrintJobDoc) {
  if (job.fileDeleted) return
  await deleteFile(job.fileKey).catch((error) => console.error("Failed to delete file", job.fileKey, error))
  await PrintJob.updateOne({ _id: job._id }, { $set: { fileDeleted: true } })
}

/** Cancels files that waited longer than QUEUE_EXPIRY_HOURS without printing and deletes their PDFs. */
export async function expireStaleJobs(scope: { shopId?: Id; orderId?: Id } = {}) {
  const cutoff = new Date(Date.now() - QUEUE_EXPIRY_MS)
  const stale = await PrintJob.find({
    ...scope,
    $or: [
      { status: "queued", queuedAt: { $lt: cutoff } },
      // Old cash jobs from before approval was removed never got a queuedAt.
      { status: "awaiting_approval", createdAt: { $lt: cutoff } },
    ],
  })
  for (const job of stale) {
    const updated = await PrintJob.findOneAndUpdate(
      { _id: job._id, status: job.status },
      {
        $set: {
          status: "cancelled",
          cancelReason: "expired",
          error: `${formatNumber(QUEUE_EXPIRY_HOURS)} ঘণ্টার মধ্যে প্রিন্ট হয়নি, তাই বাতিল হয়েছে`,
        },
        $unset: { deviceId: 1, agentId: 1 },
      },
      { returnDocument: "after" }
    )
    if (updated) await discardJobFile(updated)
  }
}

let lastExpiry = 0

/** expireStaleJobs() for every shop, at most every 10 minutes (called from frequent requests). */
export async function expireStaleJobsThrottled() {
  const now = Date.now()
  if (now - lastExpiry < 10 * 60 * 1000) return
  lastExpiry = now
  await expireStaleJobs()
}

/** The newest cash order, so dashboard pages can chime when another one comes in. */
export async function latestCashOrder(shopId: Id) {
  const order = await Order.findOne({ shopId, paymentMethod: "cash", status: "placed" })
    .sort({ placedAt: -1 })
    .select("token amount customer")
  return order ? { token: order.token, amount: order.amount, name: order.customer?.name || order.customer?.phone || "" } : null
}

/**
 * One status for a whole order: payment states come from the order, printing states from its files
 * (the least finished file wins, so "printing" shows until every file is done).
 */
export function orderStatus(order: Pick<OrderDoc, "status">, jobs: Pick<PrintJobDoc, "status">[]): JobStatus {
  if (order.status !== "placed") return order.status as JobStatus
  const statuses = jobs.map((job) => job.status as JobStatus)
  const live = statuses.filter((status) => status !== "cancelled")
  if (live.length === 0) return "cancelled"
  for (const status of ["printing", "queued", "awaiting_approval", "failed"] as const) {
    if (live.includes(status)) return status
  }
  return "completed"
}
