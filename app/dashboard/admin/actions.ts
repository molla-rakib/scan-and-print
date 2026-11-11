"use server"

import { refresh } from "next/cache"
import { isValidObjectId } from "mongoose"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { extendShop, getBillingSettings, markPaid, markUnpaid } from "@/lib/billing"
import { BkashError, testBkashCredentials } from "@/lib/bkash"
import { normalizeBdPhone } from "@/lib/constants"
import { decrypt, encrypt } from "@/lib/crypto"
import { EpsError, testEpsCredentials } from "@/lib/eps"
import { Shop, SubscriptionPayment } from "@/lib/models"

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

/* ----------------------------- Subscription payments ----------------------------- */

/** Approves a manual bKash/Nagad payment after checking it arrived: extends the shop. */
export async function approvePayment(paymentId: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!isValidObjectId(paymentId)) return fail("পেমেন্ট পাওয়া যায়নি।")
  const payment = await SubscriptionPayment.findById(paymentId)
  if (!payment || payment.status !== "pending") return fail("এই পেমেন্টটি আর যাচাইয়ের অপেক্ষায় নেই।")
  if (!(await markPaid(payment._id, { recordedBy: admin.email }))) return fail("এই পেমেন্টটি আর যাচাইয়ের অপেক্ষায় নেই।")
  refresh()
  return { ok: true }
}

export async function rejectPayment(paymentId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!isValidObjectId(paymentId)) return fail("পেমেন্ট পাওয়া যায়নি।")
  const note = reason.trim().slice(0, 200) || "টাকা পাওয়া যায়নি"
  const payment = await SubscriptionPayment.findById(paymentId)
  if (!payment || !(await markUnpaid(payment._id, "rejected", note, admin.email))) return fail("এই পেমেন্টটি আর যাচাইয়ের অপেক্ষায় নেই।")
  refresh()
  return { ok: true }
}

/* --------------------------------- Payment setup --------------------------------- */

const manualSchema = z.object({
  enabled: z.boolean(),
  bkashNumber: z.string().trim(),
  nagadNumber: z.string().trim(),
  instructions: z.string().trim().max(300),
})

export async function updateManualBilling(input: z.input<typeof manualSchema>): Promise<ActionResult> {
  await requireAdmin()
  const parsed = manualSchema.safeParse(input)
  if (!parsed.success) return fail("তথ্য সঠিক নয়।")
  const data = parsed.data
  const bkashNumber = data.bkashNumber ? normalizeBdPhone(data.bkashNumber) : ""
  const nagadNumber = data.nagadNumber ? normalizeBdPhone(data.nagadNumber) : ""
  if (bkashNumber === null) return fail("বিকাশ নম্বরটি সঠিক নয়।")
  if (nagadNumber === null) return fail("নগদ নম্বরটি সঠিক নয়।")
  if (data.enabled && !bkashNumber && !nagadNumber) return fail("চালু করতে অন্তত একটি নম্বর দিন।")

  const settings = await getBillingSettings()
  settings.set({ manual: { enabled: data.enabled, bkashNumber, nagadNumber, instructions: data.instructions } })
  await settings.save()
  refresh()
  return { ok: true }
}

const bkashSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  username: z.string().trim(),
  appKey: z.string().trim(),
  // Blank keeps the saved secret.
  password: z.string(),
  appSecret: z.string(),
})

export async function updateBkashBilling(input: z.input<typeof bkashSchema>): Promise<ActionResult> {
  await requireAdmin()
  const parsed = bkashSchema.safeParse(input)
  if (!parsed.success) return fail("বিকাশ সেটিংস সঠিক নয়।")
  const data = parsed.data
  const settings = await getBillingSettings()
  const saved = settings.bkash
  const password = data.password || (saved.passwordEnc ? decrypt(saved.passwordEnc) : "")
  const appSecret = data.appSecret || (saved.appSecretEnc ? decrypt(saved.appSecretEnc) : "")

  if (data.enabled) {
    if (!data.username || !data.appKey || !password || !appSecret) return fail("চালু করতে চারটি ক্রেডেনশিয়ালই পূরণ করুন।")
    try {
      await testBkashCredentials({ sandbox: data.sandbox, username: data.username, appKey: data.appKey, password, appSecret })
    } catch (error) {
      return fail(error instanceof BkashError ? `বিকাশ এই ক্রেডেনশিয়াল গ্রহণ করেনি: ${error.message}` : "ক্রেডেনশিয়াল যাচাই করা যায়নি।")
    }
  }

  settings.set({
    bkash: {
      enabled: data.enabled,
      sandbox: data.sandbox,
      username: data.username,
      appKey: data.appKey,
      passwordEnc: password ? encrypt(password) : "",
      appSecretEnc: appSecret ? encrypt(appSecret) : "",
    },
  })
  await settings.save()
  refresh()
  return { ok: true }
}

const epsSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  merchantId: z.string().trim(),
  storeId: z.string().trim(),
  username: z.string().trim(),
  // Blank keeps the saved secret.
  password: z.string(),
  hashKey: z.string(),
})

export async function updateEpsBilling(input: z.input<typeof epsSchema>): Promise<ActionResult> {
  await requireAdmin()
  const parsed = epsSchema.safeParse(input)
  if (!parsed.success) return fail("EPS সেটিংস সঠিক নয়।")
  const data = parsed.data
  const settings = await getBillingSettings()
  const saved = settings.eps
  const password = data.password || (saved.passwordEnc ? decrypt(saved.passwordEnc) : "")
  const hashKey = data.hashKey || (saved.hashKeyEnc ? decrypt(saved.hashKeyEnc) : "")

  if (data.enabled) {
    if (!data.merchantId || !data.storeId || !data.username || !password || !hashKey) return fail("চালু করতে সবগুলো ঘর পূরণ করুন।")
    try {
      await testEpsCredentials({ sandbox: data.sandbox, merchantId: data.merchantId, storeId: data.storeId, username: data.username, password, hashKey })
    } catch (error) {
      return fail(error instanceof EpsError ? `EPS এই ক্রেডেনশিয়াল গ্রহণ করেনি: ${error.message}` : "ক্রেডেনশিয়াল যাচাই করা যায়নি।")
    }
  }

  settings.set({
    eps: {
      enabled: data.enabled,
      sandbox: data.sandbox,
      merchantId: data.merchantId,
      storeId: data.storeId,
      username: data.username,
      passwordEnc: password ? encrypt(password) : "",
      hashKeyEnc: hashKey ? encrypt(hashKey) : "",
    },
  })
  await settings.save()
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
