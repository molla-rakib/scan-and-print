import "server-only"
import type { Types } from "mongoose"
import {
  ACTIVE_JOB_STATUSES,
  AGENT_ONLINE_WINDOW_MS,
  EXTRA_PAPER_SIZES,
  MIN_AGENT_VERSION_FOR_OPTIONS,
  versionAtLeast,
  type ColorMode,
  type JobStatus,
  type PaperSize,
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

export function subscriptionExpired(shop: ShopDoc) {
  return shop.paidUntil.getTime() <= Date.now()
}

/** Whether customers can place orders at this shop right now. */
export function shopIsOpen(shop: ShopDoc) {
  return shop.status === "active" && !subscriptionExpired(shop)
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

/** Paper sizes the shop offers, A4 first, with prices per printed side. */
export function paperOptions(shop: ShopDoc): { size: PaperSize; bw: number; color: number }[] {
  const options: { size: PaperSize; bw: number; color: number }[] = [
    { size: "A4", bw: shop.pricing?.bw ?? 0, color: shop.pricing?.color ?? 0 },
  ]
  for (const size of EXTRA_PAPER_SIZES) {
    const paper = shop.paperSizes?.[size]
    if (paper?.enabled) options.push({ size, bw: paper.bw, color: paper.color })
  }
  return options
}

/** Price per printed side, or null if the shop doesn't offer that paper size. */
export function pricePerPage(shop: ShopDoc, size: PaperSize, colorMode: ColorMode) {
  const option = paperOptions(shop).find((o) => o.size === size)
  return option ? option[colorMode] : null
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
  if (job.duplex && !device.duplex) return false
  const size = (job.paperSize ?? "A4") as PaperSize
  // An empty list means the agent didn't report sizes; trust the owner then.
  if (size !== "A4" && device.paperSizes?.length && !device.paperSizes.includes(size)) return false
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
