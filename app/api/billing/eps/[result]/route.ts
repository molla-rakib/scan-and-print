import { NextResponse, type NextRequest } from "next/server"
import { isValidObjectId } from "mongoose"
import { getBillingSettings, markPaid, markUnpaid, platformEpsCredentials } from "@/lib/billing"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { checkEpsTransaction } from "@/lib/eps"
import { SubscriptionPayment } from "@/lib/models"

/**
 * EPS sends the shop owner to /api/billing/eps/{success|fail|cancel}?payment=<id> after paying. The path is
 * only a hint: the payment is settled by asking EPS for the transaction status.
 */
async function handle(request: NextRequest, { params }: RouteContext<"/api/billing/eps/[result]">) {
  const { result } = await params
  const paymentRef = request.nextUrl.searchParams.get("payment") ?? ""
  const back = (outcome: string) => NextResponse.redirect(`${env.appUrl}/dashboard/billing?payment=${outcome}`, 303)

  await connectDb()
  const payment = isValidObjectId(paymentRef) ? await SubscriptionPayment.findById(paymentRef) : null
  if (!payment || payment.method !== "eps" || !payment.gatewayRef) return back("failed")
  if (payment.status !== "pending") return back(payment.status === "paid" ? "success" : "failed")

  const creds = platformEpsCredentials(await getBillingSettings())
  if (!creds) return back("failed")
  try {
    const status = await checkEpsTransaction(creds, payment.gatewayRef)
    if (status.paid && (status.amount === undefined || status.amount + 0.001 >= payment.amount)) {
      await markPaid(payment._id, { trxId: status.trxId })
      return back("success")
    }
    const cancelled = result === "cancel"
    await markUnpaid(payment._id, cancelled ? "cancelled" : "failed", status.status ? `EPS: ${status.status}` : undefined)
    return back(cancelled ? "cancelled" : "failed")
  } catch (error) {
    // Couldn't reach EPS: leave it pending so a later visit (or the admin) can settle it.
    console.error("EPS status check failed", error)
    return back("failed")
  }
}

export const GET = handle
export const POST = handle
