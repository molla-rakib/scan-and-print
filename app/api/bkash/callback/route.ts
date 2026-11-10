import { NextResponse, type NextRequest } from "next/server"
import { executePayment, shopBkashCredentials } from "@/lib/bkash"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { placeOrder } from "@/lib/jobs"
import { Order, Shop } from "@/lib/models"

/** bKash redirects the customer here after the payment page. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  // "job" is what payments started before orders could hold several files used.
  const publicId = params.get("order") ?? params.get("job") ?? ""
  const paymentId = params.get("paymentID") ?? ""
  const status = params.get("status")
  const back = (query = "") => NextResponse.redirect(`${env.appUrl}/j/${encodeURIComponent(publicId)}${query}`)

  await connectDb()
  const order = await Order.findOne({ publicId })
  const shop = order && (await Shop.findById(order.shopId))
  if (!order || !shop) return NextResponse.redirect(env.appUrl)

  // Already processed (e.g. the customer refreshed the callback page).
  if (order.status !== "pending_payment") return back()
  if (!paymentId || order.bkash?.paymentId !== paymentId) return back("?payment=failed")
  if (status !== "success") return back(`?payment=${status === "cancel" ? "cancelled" : "failed"}`)

  const creds = shopBkashCredentials(shop)
  if (!creds) return back("?payment=failed")

  try {
    const result = await executePayment(creds, paymentId)
    if (!result.completed || (result.amount !== undefined && result.amount + 0.001 < order.amount)) {
      return back("?payment=failed")
    }
    await placeOrder(order._id, ["pending_payment"], {
      "bkash.trxId": result.trxId,
      "bkash.payer": result.payer,
    })
    return back()
  } catch (error) {
    console.error("bKash execute failed", error)
    return back("?payment=failed")
  }
}
