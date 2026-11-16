"use server"

import { refresh } from "next/cache"
import { isValidObjectId } from "mongoose"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { extendShop } from "@/lib/billing"
import { Agent, Device, Order, PrintJob, Shop, SubscriptionPayment, UploadPart } from "@/lib/models"
import { deleteFile } from "@/lib/storage"

async function findShop(shopId: string) {
  await requireAdmin()
  return isValidObjectId(shopId) ? Shop.findById(shopId) : null
}

export async function setDeviceLimit(shopId: string, limit: number): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  if (!Number.isInteger(limit) || limit < 0 || limit > 100) return fail("সঠিক সংখ্যা দিন।")
  shop.deviceLimit = limit
  await shop.save()
  refresh()
  return { ok: true }
}

/**
 * Records a payment: extends the subscription by `days` from today or from the current end date, whichever
 * is later, and stores the amount received (0 for a free extension, which doesn't count as income).
 */
export async function extendSubscription(shopId: string, days: number, amount: number): Promise<ActionResult> {
  const admin = await requireAdmin()
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  if (!Number.isInteger(days) || days < 1 || days > 366) return fail("সঠিক দিন সংখ্যা দিন।")
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return fail("সঠিক টাকার পরিমাণ দিন।")
  const paidUntil = await extendShop(shop._id, days)
  await SubscriptionPayment.create({
    shopId: shop._id,
    method: "admin",
    status: "paid",
    amount,
    days,
    paidUntil,
    paidAt: new Date(),
    recordedBy: admin.email,
  })
  refresh()
  return { ok: true }
}

export async function setShopStatus(shopId: string, status: "active" | "suspended"): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  shop.status = status
  await shop.save()
  refresh()
  return { ok: true }
}

/**
 * Deletes a shop and everything that belongs to it, for good: orders, print jobs and their stored PDFs,
 * upload pieces, the shop's computers and printers, and its subscription payments. The owner's login stays,
 * so they could set up a new shop. `confirm` must be the shop's link (slug), typed by the admin. The shop
 * itself goes last, so a delete that fails half-way can simply be run again.
 */
export async function deleteShop(shopId: string, confirm: string): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  if (confirm.trim().toLowerCase() !== shop.slug) return fail("দোকানের লিংক মেলেনি। ঠিকভাবে লিখুন।")

  const files = await PrintJob.find({ shopId: shop._id, fileDeleted: { $ne: true } }).select("fileKey").lean()
  for (const job of files) await deleteFile(job.fileKey)
  await PrintJob.deleteMany({ shopId: shop._id })
  await Order.deleteMany({ shopId: shop._id })
  await UploadPart.deleteMany({ shopId: shop._id })
  await Device.deleteMany({ shopId: shop._id })
  await Agent.deleteMany({ shopId: shop._id })
  await SubscriptionPayment.deleteMany({ shopId: shop._id })
  await Shop.deleteOne({ _id: shop._id })
  console.info("Shop deleted", shop.slug, String(shop._id), "files", files.length)
  refresh()
  return { ok: true }
}

/* ----------------------------------- Discount ----------------------------------- */

const discountSchema = z.object({
  kind: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  // "YYYY-MM-DD", or empty for no end date.
  until: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  note: z.string().trim().max(120),
})

/** Gives a shop a discount on its subscription: % off, or a fixed monthly fee for the whole shop. */
export async function setDiscount(shopId: string, input: z.input<typeof discountSchema>): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  const parsed = discountSchema.safeParse(input)
  if (!parsed.success) return fail("ছাড়ের তথ্য সঠিক নয়।")
  const { kind, value, until, note } = parsed.data
  if (kind === "percent" && (value <= 0 || value > 100)) return fail("ছাড় ১ থেকে ১০০ শতাংশের মধ্যে দিন।")
  if (kind === "fixed" && !Number.isInteger(value)) return fail("মাসিক ফি পূর্ণ টাকায় দিন।")
  // End of that day in Dhaka (UTC+6).
  const end = until ? new Date(`${until}T23:59:59+06:00`) : undefined
  if (end && end.getTime() <= Date.now()) return fail("শেষ তারিখ আজকের পরে দিন।")
  shop.set("discount", { kind, value, until: end, note })
  await shop.save()
  refresh()
  return { ok: true }
}

export async function removeDiscount(shopId: string): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  shop.set("discount", undefined)
  await shop.save()
  refresh()
  return { ok: true }
}
