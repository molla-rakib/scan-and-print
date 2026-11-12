import "server-only"
import type { Types } from "mongoose"
import { daysAgo, shopIsOpen, startOfMonthInDhaka } from "@/lib/jobs"
import { containsRegex, type ListParams } from "@/lib/list-params"
import { Device, PrintJob, Shop, SubscriptionPayment, User } from "@/lib/models"

/** Totals for the stat cards: always over all shops, whatever the search or page. */
export async function loadShopStats() {
  const [shops, enabledDevices, monthIncome] = await Promise.all([
    Shop.find().select("status paidUntil"),
    Device.countDocuments({ enabled: true }),
    // Only money actually received this calendar month.
    // Records from before online payments have no status and count as paid; paidAt falls back to createdAt.
    SubscriptionPayment.aggregate<{ total: number }>([
      {
        $match: {
          status: { $nin: ["pending", "failed", "cancelled", "rejected"] },
          $expr: { $gte: [{ $ifNull: ["$paidAt", "$createdAt"] }, startOfMonthInDhaka()] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ])
  return {
    totalShops: shops.length,
    activeShops: shops.filter(shopIsOpen).length,
    enabledDevices,
    monthIncome: monthIncome[0]?.total ?? 0,
  }
}

/** Search box: shop name, phone or link (slug), or the owner's email. Empty `q` matches every shop. */
async function shopSearchFilter(q: string) {
  const regex = containsRegex(q)
  if (!regex) return {}
  const owners = await User.find({ email: regex }).select("_id")
  return {
    $or: [{ name: regex }, { phone: regex }, { slug: regex }, { ownerId: { $in: owners.map((o) => o._id) } }],
  }
}

/** One page of the shops table, newest first, with each row's owner email, enabled devices and 30-day orders. */
export async function loadShopsPage({ q, skip, limit }: ListParams) {
  const filter = await shopSearchFilter(q)
  const [shops, total] = await Promise.all([
    Shop.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Shop.countDocuments(filter),
  ])
  const ids = shops.map((s) => s._id)
  const monthAgo = daysAgo(30)

  const [owners, enabledDevices, monthlyJobs] = await Promise.all([
    User.find({ _id: { $in: shops.map((s) => s.ownerId) } }).select("email"),
    Device.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { enabled: true, shopId: { $in: ids } } },
      { $group: { _id: "$shopId", count: { $sum: 1 } } },
    ]),
    PrintJob.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { queuedAt: { $gte: monthAgo }, shopId: { $in: ids } } },
      { $group: { _id: "$shopId", count: { $sum: 1 } } },
    ]),
  ])
  const countBy = (rows: { _id: Types.ObjectId; count: number }[], id: Types.ObjectId) => rows.find((row) => row._id.equals(id))?.count ?? 0

  return {
    total,
    rows: shops.map((shop) => ({
      shop,
      ownerEmail: owners.find((o) => o._id.equals(shop.ownerId))?.email ?? "—",
      enabledDevices: countBy(enabledDevices, shop._id),
      monthlyJobs: countBy(monthlyJobs, shop._id),
    })),
  }
}
