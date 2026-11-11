import "server-only"
import type { Types } from "mongoose"
import type { BkashCredentials } from "@/lib/bkash"
import { DAYS_PER_MONTH, type SubscriptionMethod } from "@/lib/constants"
import { decrypt } from "@/lib/crypto"
import { env } from "@/lib/env"
import type { EpsCredentials } from "@/lib/eps"
import { BillingSettings, Shop, SubscriptionPayment, type BillingSettingsDoc, type ShopDoc } from "@/lib/models"

// Shops paying their subscription to us. Every method shares one flow: a SubscriptionPayment is created as
// "pending", then becomes paid / failed / cancelled / rejected. Only markPaid() extends the subscription.

export async function getBillingSettings(): Promise<BillingSettingsDoc> {
  return BillingSettings.findOneAndUpdate(
    { key: "billing" },
    { $setOnInsert: { key: "billing" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ) as Promise<BillingSettingsDoc>
}

export function platformBkashCredentials(settings: BillingSettingsDoc): BkashCredentials | null {
  const b = settings.bkash
  if (!b.username || !b.appKey || !b.passwordEnc || !b.appSecretEnc) return null
  return { sandbox: b.sandbox, username: b.username, appKey: b.appKey, password: decrypt(b.passwordEnc), appSecret: decrypt(b.appSecretEnc) }
}

export function platformEpsCredentials(settings: BillingSettingsDoc): EpsCredentials | null {
  const e = settings.eps
  if (!e.merchantId || !e.storeId || !e.username || !e.passwordEnc || !e.hashKeyEnc) return null
  return {
    sandbox: e.sandbox,
    merchantId: e.merchantId,
    storeId: e.storeId,
    username: e.username,
    password: decrypt(e.passwordEnc),
    hashKey: decrypt(e.hashKeyEnc),
  }
}

/** The methods an owner can pay with right now: switched on by the admin and fully set up. */
export function availableBillingMethods(settings: BillingSettingsDoc) {
  const manual = settings.manual
  const methods: SubscriptionMethod[] = []
  if (manual.enabled && manual.bkashNumber) methods.push("manual_bkash")
  if (manual.enabled && manual.nagadNumber) methods.push("manual_nagad")
  if (settings.bkash.enabled && platformBkashCredentials(settings)) methods.push("bkash")
  if (settings.eps.enabled && platformEpsCredentials(settings)) methods.push("eps")
  return methods
}

/** The full monthly price: device limit (at least one) × the device fee. */
export function baseMonthlyFee(shop: ShopDoc) {
  return Math.max(shop.deviceLimit, 1) * env.deviceMonthlyFee
}

/** The shop's discount, if it has one that hasn't ended. */
export function activeDiscount(shop: ShopDoc) {
  const discount = shop.discount
  if (!discount?.kind) return null
  if (discount.until && discount.until.getTime() <= Date.now()) return null
  return { kind: discount.kind as "percent" | "fixed", value: discount.value, until: discount.until ?? null, note: discount.note ?? "" }
}

/** What a shop pays per month, after its discount. Whole taka; never more than the full price. */
export function monthlyFee(shop: ShopDoc) {
  const base = baseMonthlyFee(shop)
  const discount = activeDiscount(shop)
  if (!discount) return base
  const fee = discount.kind === "percent" ? base * (1 - Math.min(discount.value, 100) / 100) : discount.value
  return Math.max(0, Math.min(base, Math.round(fee)))
}

/** Extends a shop by `days` from today or from its current end date, whichever is later. */
export async function extendShop(shopId: Types.ObjectId, days: number) {
  const shop = await Shop.findById(shopId)
  if (!shop) throw new Error("Shop not found")
  const from = Math.max(Date.now(), shop.paidUntil.getTime())
  shop.paidUntil = new Date(from + days * 24 * 60 * 60 * 1000)
  await shop.save()
  return shop.paidUntil
}

/**
 * Marks a pending payment paid and extends the shop. Idempotent: only the first call for a payment
 * (e.g. of repeated gateway callbacks, or two admins approving) does anything.
 */
export async function markPaid(paymentId: Types.ObjectId, extra: { trxId?: string; recordedBy?: string } = {}) {
  const payment = await SubscriptionPayment.findOneAndUpdate(
    { _id: paymentId, status: "pending" },
    { $set: { status: "paid", paidAt: new Date(), ...(extra.trxId ? { trxId: extra.trxId } : {}), ...(extra.recordedBy ? { recordedBy: extra.recordedBy } : {}) } },
    { returnDocument: "after" }
  )
  if (!payment) return false
  const paidUntil = await extendShop(payment.shopId, payment.days)
  await SubscriptionPayment.updateOne({ _id: payment._id }, { $set: { paidUntil } })
  return true
}

/** Ends a pending payment without extending anything. */
export async function markUnpaid(paymentId: Types.ObjectId, status: "failed" | "cancelled" | "rejected", note?: string, recordedBy?: string) {
  const result = await SubscriptionPayment.updateOne(
    { _id: paymentId, status: "pending" },
    { $set: { status, ...(note ? { note } : {}), ...(recordedBy ? { recordedBy } : {}) } }
  )
  return result.modifiedCount > 0
}

/** Days a number of months buys. */
export function monthsToDays(months: number) {
  return months * DAYS_PER_MONTH
}
