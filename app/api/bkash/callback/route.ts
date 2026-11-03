import { NextResponse, type NextRequest } from "next/server"
import { executePayment, shopBkashCredentials } from "@/lib/bkash"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { queueJob } from "@/lib/jobs"
import { PrintJob, Shop } from "@/lib/models"

/** bKash redirects the customer here after the payment page. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const publicId = params.get("job") ?? ""
  const paymentId = params.get("paymentID") ?? ""
  const status = params.get("status")
  const back = (query = "") => NextResponse.redirect(`${env.appUrl}/j/${encodeURIComponent(publicId)}${query}`)

  await connectDb()
  const job = await PrintJob.findOne({ publicId })
  const shop = job && (await Shop.findById(job.shopId))
  if (!job || !shop) return NextResponse.redirect(env.appUrl)

  // Already processed (e.g. the customer refreshed the callback page).
  if (job.status !== "pending_payment") return back()
  if (!paymentId || job.bkash?.paymentId !== paymentId) return back("?payment=failed")
  if (status !== "success") return back(`?payment=${status === "cancel" ? "cancelled" : "failed"}`)

  const creds = shopBkashCredentials(shop)
  if (!creds) return back("?payment=failed")

  try {
    const result = await executePayment(creds, paymentId)
    if (!result.completed || (result.amount !== undefined && result.amount + 0.001 < job.amount)) {
      return back("?payment=failed")
    }
    await queueJob(job._id, ["pending_payment"], {
      "bkash.trxId": result.trxId,
      "bkash.payer": result.payer,
    })
    return back()
  } catch (error) {
    console.error("bKash execute failed", error)
    return back("?payment=failed")
  }
}
