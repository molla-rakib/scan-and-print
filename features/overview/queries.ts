import "server-only"
import { availableDevices, expireStaleJobs, latestCashOrder, paymentOptions } from "@/lib/jobs"
import { Agent, Device, PrintJob, type ShopDoc } from "@/lib/models"

function startOfTodayInDhaka() {
  const now = new Date()
  const dhaka = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }))
  return new Date(now.getTime() - (dhaka.getHours() * 3600 + dhaka.getMinutes() * 60 + dhaka.getSeconds()) * 1000)
}

/** Everything the overview shows: today's numbers, printers, setup progress and the latest orders. */
export async function loadOverview(shop: ShopDoc) {
  await expireStaleJobs({ shopId: shop._id })
  const today = startOfTodayInDhaka()

  const [todayStats, latestCash, online, enabledCount, pairedPcs, recentJobs] = await Promise.all([
    // One order can hold several files (jobs); count orders, add up the files' amounts.
    PrintJob.aggregate<{ count: number; revenue: number; cash: number }>([
      { $match: { shopId: shop._id, queuedAt: { $gte: today }, status: { $nin: ["cancelled", "draft"] } } },
      {
        $group: {
          _id: null,
          orders: { $addToSet: "$orderId" },
          revenue: { $sum: "$amount" },
          cash: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$amount", 0] } },
        },
      },
      { $project: { count: { $size: "$orders" }, revenue: 1, cash: 1 } },
    ]),
    latestCashOrder(shop._id),
    availableDevices(shop._id),
    Device.countDocuments({ shopId: shop._id, enabled: true }),
    Agent.countDocuments({ shopId: shop._id, tokenHash: { $exists: true } }),
    PrintJob.find({ shopId: shop._id, status: { $ne: "draft" } }).sort({ createdAt: -1 }).limit(6),
  ])

  const payments = paymentOptions(shop)
  return {
    today: { count: todayStats[0]?.count ?? 0, revenue: todayStats[0]?.revenue ?? 0, cash: todayStats[0]?.cash ?? 0 },
    latestCash,
    onlineCount: online.length,
    enabledCount,
    pairedPcs,
    paymentsReady: payments.bkash || payments.cash,
    recentJobs,
  }
}

export type RecentJob = Awaited<ReturnType<typeof loadOverview>>["recentJobs"][number]
