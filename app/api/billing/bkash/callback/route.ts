import { NextResponse, type NextRequest } from "next/server"
import { isValidObjectId } from "mongoose"
import { getBillingSettings, markPaid, markUnpaid, platformBkashCredentials } from "@/lib/billing"
import { executePayment } from "@/lib/bkash"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { SubscriptionPayment } from "@/lib/models"

/** bKash sends the shop owner here after paying their subscription. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const paymentRef = params.get("payment") ?? ""
  const paymentId = params.get("paymentID") ?? ""
  const status = params.get("status")
  const back = (result: string) => NextResponse.redirect(`${env.appUrl}/dashboard/billing?payment=${result}`)

  await connectDb()
  const payment = isValidObjectId(paymentRef) ? await SubscriptionPayment.findById(paymentRef) : null
  if (!payment || payment.method !== "bkash") return back("failed")
  // Already handled (e.g. the page was refreshed).
  if (payment.status !== "pending") return back(payment.status === "paid" ? "success" : "failed")
  if (!paymentId || payment.gatewayRef !== paymentId) return back("failed")
  if (status !== "success") {
    await markUnpaid(payment._id, status === "cancel" ? "cancelled" : "failed")
    return back(status === "cancel" ? "cancelled" : "failed")
  }

  const creds = platformBkashCredentials(await getBillingSettings())
  if (!creds) return back("failed")
  try {
    // Execute, falling back to the status query: bKash's answer decides, never the redirect alone.
    const result = await executePayment(creds, paymentId)
    if (!result.completed || (result.amount !== undefined && result.amount + 0.001 < payment.amount)) {
      await markUnpaid(payment._id, "failed", "বিকাশ পেমেন্ট সম্পন্ন হয়নি")
      return back("failed")
    }
    await markPaid(payment._id, { trxId: result.trxId })
    return back("success")
  } catch (error) {
    console.error("Subscription bKash execute failed", error)
    await markUnpaid(payment._id, "failed", error instanceof Error ? error.message : undefined)
    return back("failed")
  }
}
