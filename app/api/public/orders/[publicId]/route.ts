import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api"
import { connectDb } from "@/lib/db"
import { Order, Shop } from "@/lib/models"
import { publicOrderView } from "@/lib/public-shop"

/** Live order status for the customer's status page. */
export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  await connectDb()
  const order = await Order.findOne({ publicId })
  const shop = order && (await Shop.findById(order.shopId))
  if (!order || !shop) return jsonError("অর্ডার পাওয়া যায়নি", 404)

  return NextResponse.json(await publicOrderView(order, shop), { headers: { "Cache-Control": "no-store" } })
}
