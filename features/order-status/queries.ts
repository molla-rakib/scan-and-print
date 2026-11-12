import "server-only"
import { connectDb } from "@/lib/db"
import { Order, Shop } from "@/lib/models"
import { publicOrderView } from "@/lib/public-shop"

/** What the customer sees of a placed order, or null when there is no such order (drafts don't count). */
export async function orderStatusView(publicId: string) {
  await connectDb()
  const order = await Order.findOne({ publicId })
  const shop = order && (await Shop.findById(order.shopId))
  if (!order || !shop || order.status === "draft") return null
  return publicOrderView(order, shop)
}
