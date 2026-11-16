import "server-only"
import { getBillingSettings } from "@/lib/billing"
import { containsRegex, type ListParams } from "@/lib/list-params"
import { Device, SubscriptionPayment, type ShopDoc } from "@/lib/models"

const MANUAL_METHODS = ["manual_bkash", "manual_nagad"] as const

/**
 * Everything the billing page reads: billing settings, the shop's enabled devices, whether it ever paid,
 * whether a manual payment is waiting, and one page of its payment history (searched by TrxID / sender number).
 */
export async function getBillingData(shop: ShopDoc, { q, skip, limit }: ListParams) {
  const search = containsRegex(q)
  const historyFilter: Record<string, unknown> = {
    shopId: shop._id,
    $and: [
      // Gateway attempts the owner abandoned stay pending forever; only manual ones are really waiting.
      { $or: [{ status: { $ne: "pending" } }, { method: { $in: MANUAL_METHODS } }] },
      ...(search ? [{ $or: [{ trxId: search }, { senderNumber: search }] }] : []),
    ],
  }

  const [settings, payments, total, enabledDevices, everPaid, hasPendingManual] = await Promise.all([
    getBillingSettings(),
    SubscriptionPayment.find(historyFilter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    SubscriptionPayment.countDocuments(historyFilter),
    Device.countDocuments({ shopId: shop._id, enabled: true }),
    // Records from before online payments have no status and count as paid.
    SubscriptionPayment.exists({ shopId: shop._id, status: { $in: ["paid", null] } }),
    SubscriptionPayment.exists({ shopId: shop._id, status: "pending", method: { $in: MANUAL_METHODS } }),
  ])

  return { settings, payments, total, enabledDevices, everPaid: Boolean(everPaid), hasPendingManual: Boolean(hasPendingManual) }
}

export type BillingPayment = Awaited<ReturnType<typeof getBillingData>>["payments"][number]
