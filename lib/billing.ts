import "server-only"
import type { Types } from "mongoose"
import type { BkashCredentials } from "@/lib/bkash"
import { DAYS_PER_MONTH, RENEW_NOTICE_DAYS, monthlyFeeFor, type SubscriptionMethod } from "@/lib/constants"
import { decrypt } from "@/lib/crypto"
import { env } from "@/lib/env"
import type { EpsCredentials } from "@/lib/eps"
import { rebalanceQueue } from "@/lib/jobs"
import { BillingSettings, Device, Shop, SubscriptionPayment, type BillingSettingsDoc, type ShopDoc } from "@/lib/models"

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

/** What a shop pays per month for `devices` devices (default: its current limit), after its discount. */
export function monthlyFee(shop: ShopDoc, devices = shop.deviceLimit) {
  return monthlyFeeFor(env.deviceMonthlyFee, devices, activeDiscount(shop))
}

/**
 * Whether the owner may choose a new device count with this payment: only when we ask for payment, i.e.
 * from RENEW_NOTICE_DAYS before the end date onwards, and not with a fixed-fee discount (that fee was agreed
 * for the current devices). Otherwise devices are added by the admin.
 */
export function canChangeDevices(shop: ShopDoc) {
  if (activeDiscount(shop)?.kind === "fixed") return false
  return shop.paidUntil.getTime() - Date.now() <= RENEW_NOTICE_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Switches off enabled devices beyond `limit`, keeping connected printers first, then the oldest. Queued jobs
 * on the switched-off ones are routed to the remaining printers.
 */
export async function switchOffExtraDevices(shopId: Types.ObjectId, limit: number) {
  const enabled = await Device.find({ shopId, enabled: true }).sort({ present: -1, createdAt: 1 }).select("_id")
  const extra = enabled.slice(Math.max(limit, 0)).map((d) => d._id)
  if (!extra.length) return
  await Device.updateMany({ _id: { $in: extra } }, { $set: { enabled: false } })
  await rebalanceQueue(shopId)
}

/**
 * Extends a shop by `days` from now or from its current end date, whichever is later, and optionally sets a
 * new device limit. One atomic update, so two payments settled at the same moment both count.
 */
export async function extendShop(shopId: Types.ObjectId, days: number, deviceLimit?: number) {
  const shop = await Shop.findOneAndUpdate(
    { _id: shopId },
    [
      {
        $set: {
          paidUntil: { $add: [{ $max: ["$$NOW", "$paidUntil"] }, days * 24 * 60 * 60 * 1000] },
          ...(deviceLimit ? { deviceLimit } : {}),
        },
      },
    ],
    { returnDocument: "after", updatePipeline: true }
  )
  if (!shop) throw new Error("Shop not found")
  return shop.paidUntil
}

/**
 * Marks a pending payment paid, extends the shop and applies the device count chosen with it. Idempotent:
 * only the first call for a payment (e.g. of repeated gateway callbacks, or two admins approving) does
 * anything. If extending fails, the payment goes back to pending so it can be settled again.
 */
export async function markPaid(paymentId: Types.ObjectId, extra: { trxId?: string; recordedBy?: string } = {}) {
  const payment = await SubscriptionPayment.findOneAndUpdate(
    { _id: paymentId, status: "pending" },
    { $set: { status: "paid", paidAt: new Date(), ...(extra.trxId ? { trxId: extra.trxId } : {}), ...(extra.recordedBy ? { recordedBy: extra.recordedBy } : {}) } },
    { returnDocument: "after" }
  )
  if (!payment) return false

  let paidUntil: Date
  try {
    paidUntil = await extendShop(payment.shopId, payment.days, payment.devices ?? undefined)
  } catch (error) {
    console.error("Paid subscription could not be applied; back to pending", payment.id, error)
    await SubscriptionPayment.updateOne({ _id: payment._id, status: "paid" }, { $set: { status: "pending" }, $unset: { paidAt: 1 } })
    throw error
  }
  await SubscriptionPayment.updateOne({ _id: payment._id }, { $set: { paidUntil } })
  // Fewer devices than are switched on: switch off the rest. Not critical to the payment, so only logged.
  if (payment.devices) {
    await switchOffExtraDevices(payment.shopId, payment.devices).catch((error) =>
      console.error("Could not switch off extra devices", payment.shopId, error)
    )
  }
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
