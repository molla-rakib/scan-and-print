"use server"

import { refresh } from "next/cache"
import { isValidObjectId, type Types } from "mongoose"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireShop } from "@/lib/auth"
import type { JobStatus } from "@/lib/constants"
import { discardJobFile, queueJob } from "@/lib/jobs"
import { Order, PrintJob } from "@/lib/models"
import { deleteFile } from "@/lib/storage"

/* ----------------------------------- Jobs ---------------------------------- */

async function findShopJob(jobId: string) {
  const { shop } = await requireShop()
  if (!isValidObjectId(jobId)) return null
  return PrintJob.findOne({ _id: jobId, shopId: shop._id })
}

/** Cash orders: the owner collected the money, so start printing. */
export async function approveJob(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  if (!(await queueJob(job._id, ["awaiting_approval"]))) return fail("এই অর্ডারটি এখন আর অনুমোদন করা যাবে না।")
  refresh()
  return { ok: true }
}

export async function cancelJob(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  const updated = await PrintJob.findOneAndUpdate(
    { _id: job._id, status: { $in: ["awaiting_approval", "queued", "failed", "pending_payment"] } },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" }
  )
  if (!updated) return fail("এই অর্ডারটি এখন আর বাতিল করা যাবে না।")
  await discardJobFile(updated)
  refresh()
  return { ok: true }
}

export async function reprintJob(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  if (job.fileDeleted) return fail("ফাইলটি আগেই মুছে ফেলা হয়েছে।")
  const queued = await queueJob(job._id, ["failed"], { error: null, deviceId: null, agentId: null })
  if (!queued) return fail("শুধু ব্যর্থ অর্ডার আবার প্রিন্ট করা যায়।")
  refresh()
  return { ok: true }
}

/** The owner confirms the pages were printed (e.g. after fixing a jam manually). */
export async function markJobCompleted(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  const updated = await PrintJob.findOneAndUpdate(
    { _id: job._id, status: { $in: ["printing", "failed"] } },
    { $set: { status: "completed", completedAt: new Date(), error: null } },
    { returnDocument: "after" }
  )
  if (!updated) return fail("এই অর্ডারটিকে সম্পন্ন হিসেবে চিহ্নিত করা যাবে না।")
  await discardJobFile(updated)
  refresh()
  return { ok: true }
}

/* --------------------------------- Orders ---------------------------------- */

// Files still waiting or printing: an order with any of these can't be deleted.
const LIVE_JOB_STATUSES: JobStatus[] = ["queued", "printing", "awaiting_approval"]

/** Deletes orders with their print jobs and any stored files. */
async function removeOrders(orderIds: Types.ObjectId[]) {
  const jobs = await PrintJob.find({ orderId: { $in: orderIds } }).select("fileKey fileDeleted")
  for (const job of jobs) {
    if (!job.fileDeleted) await deleteFile(job.fileKey).catch((error) => console.error("Failed to delete file", job.fileKey, error))
  }
  await PrintJob.deleteMany({ orderId: { $in: orderIds } })
  await Order.deleteMany({ _id: { $in: orderIds } })
}

/** Removes one order from the history. Not allowed while any of its files is waiting or printing. */
export async function deleteOrder(orderId: string): Promise<ActionResult> {
  const { shop } = await requireShop()
  if (!isValidObjectId(orderId)) return fail("অর্ডার পাওয়া যায়নি।")
  const order = await Order.findOne({ _id: orderId, shopId: shop._id })
  if (!order) return fail("অর্ডার পাওয়া যায়নি।")
  if (await PrintJob.exists({ orderId: order._id, status: { $in: LIVE_JOB_STATUSES } })) {
    return fail("এই অর্ডারের ফাইল এখনো লাইনে বা প্রিন্টে আছে। আগে বাতিল বা সম্পন্ন করুন।")
  }
  await removeOrders([order._id])
  refresh()
  return { ok: true }
}

/** Clears the history: every placed order whose files are all completed or cancelled. */
export async function deleteOrderHistory(): Promise<ActionResult<{ deleted: number }>> {
  const { shop } = await requireShop()
  const finished = await PrintJob.aggregate<{ _id: Types.ObjectId }>([
    { $match: { shopId: shop._id } },
    { $group: { _id: "$orderId", statuses: { $addToSet: "$status" } } },
    { $match: { statuses: { $not: { $elemMatch: { $nin: ["completed", "cancelled"] } } } } },
  ])
  const placed = await Order.find({ _id: { $in: finished.map((row) => row._id) }, shopId: shop._id, status: "placed" }).select("_id")
  await removeOrders(placed.map((order) => order._id))
  refresh()
  return { ok: true, deleted: placed.length }
}
