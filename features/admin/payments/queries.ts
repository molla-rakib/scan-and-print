import "server-only"
import { containsRegex, type ListParams } from "@/lib/list-params"
import { Shop, SubscriptionPayment } from "@/lib/models"
import { MANUAL_METHODS } from "../queries"

/** Search box: shop name (via the shops' ids), TrxID or sender number. Empty `q` adds no condition. */
async function paymentSearch(q: string) {
  const regex = containsRegex(q)
  if (!regex) return {}
  const shops = await Shop.find({ name: regex }).select("_id")
  return { $or: [{ shopId: { $in: shops.map((s) => s._id) } }, { trxId: regex }, { senderNumber: regex }] }
}

async function loadPage(base: Record<string, unknown>, sort: Record<string, 1 | -1>, { q, skip, limit }: ListParams) {
  const filter = { ...base, ...(await paymentSearch(q)) }
  const [rows, total] = await Promise.all([
    SubscriptionPayment.find(filter).sort(sort).skip(skip).limit(limit),
    SubscriptionPayment.countDocuments(filter),
  ])
  return { rows, total }
}

/**
 * Both tables of the payments page, each with its own search and page: manual payments waiting for approval
 * (oldest first) and the history (newest first), plus the names of the shops on screen.
 */
export async function loadPayments(pending: ListParams, history: ListParams) {
  const [waiting, recent] = await Promise.all([
    loadPage({ status: "pending", method: { $in: MANUAL_METHODS } }, { createdAt: 1, _id: 1 }, pending),
    // Abandoned gateway attempts stay pending; they are noise here.
    loadPage({ $nor: [{ status: "pending", method: { $nin: MANUAL_METHODS } }] }, { createdAt: -1, _id: -1 }, history),
  ])
  const shops = await Shop.find({ _id: { $in: [...waiting.rows, ...recent.rows].map((p) => p.shopId) } }).select("name slug")
  const shopName = (id: unknown) => shops.find((s) => s._id.equals(id as string))?.name ?? "—"
  return { waiting, recent, shopName }
}

/** One subscription payment as loaded for the tables. */
export type PaymentRow = Awaited<ReturnType<typeof loadPage>>["rows"][number]
