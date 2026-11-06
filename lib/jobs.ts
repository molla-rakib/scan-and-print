import "server-only"
import type { Types } from "mongoose"
import { ACTIVE_JOB_STATUSES, AGENT_ONLINE_WINDOW_MS, type ColorMode, type JobStatus } from "@/lib/constants"
import { Agent, Device, PrintJob, Shop, type DeviceDoc, type PrintJobDoc, type ShopDoc } from "@/lib/models"
import { deleteFile } from "@/lib/storage"

type Id = Types.ObjectId | string

export function onlineCutoff() {
  return new Date(Date.now() - AGENT_ONLINE_WINDOW_MS)
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
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

/** Enabled printers whose shop PC is currently online. */
export async function availableDevices(shopId: Id) {
  const agents = await Agent.find({ shopId, lastSeenAt: { $gte: onlineCutoff() } }).select("_id")
  if (!agents.length) return []
  return Device.find({ shopId, enabled: true, present: true, agentId: { $in: agents.map((a) => a._id) } })
}

export async function nextToken(shopId: Id) {
  const shop = await Shop.findByIdAndUpdate(shopId, { $inc: { tokenSeq: 1 } }, { returnDocument: "after" })
  if (!shop) throw new Error("Shop not found")
  // Short numbers are easier to call out at the counter.
  return ((shop.tokenSeq - 1) % 999) + 1
}

/**
 * Picks the best device for a job: color jobs need a color device; black & white
 * jobs prefer mono devices (cheaper per page) unless those are much busier.
 */
export async function pickDevice(shopId: Id, colorMode: ColorMode): Promise<DeviceDoc | null> {
  const devices = (await availableDevices(shopId)).filter((d) => colorMode === "bw" || d.color)
  if (!devices.length) return null

  const loads = await PrintJob.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { deviceId: { $in: devices.map((d) => d._id) }, status: { $in: ACTIVE_JOB_STATUSES } } },
    { $group: { _id: "$deviceId", count: { $sum: 1 } } },
  ])
  const loadOf = (d: DeviceDoc) => loads.find((l) => l._id.equals(d._id))?.count ?? 0
  const score = (d: DeviceDoc) => loadOf(d) + (colorMode === "bw" && d.color ? 2 : 0)

  return devices.sort((a, b) => score(a) - score(b))[0]
}

/** Moves a paid or approved job into the print queue and routes it to a device. */
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

export async function assignDevice(job: PrintJobDoc) {
  const device = await pickDevice(job.shopId, job.colorMode as ColorMode)
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
  const job = await PrintJob.findOne({ shopId, paymentMethod: "cash", status: { $nin: ["draft", "cancelled"] } })
    .sort({ createdAt: -1 })
    .select("token amount customer")
  return job ? { token: job.token, amount: job.amount, name: job.customer?.name ?? "" } : null
}
