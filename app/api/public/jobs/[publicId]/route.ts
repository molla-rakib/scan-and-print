import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api"
import { connectDb } from "@/lib/db"
import { PrintJob, Shop } from "@/lib/models"
import { publicJobView } from "@/lib/public-shop"

/** Live job status for the customer's status page. */
export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  await connectDb()
  const job = await PrintJob.findOne({ publicId })
  const shop = job && (await Shop.findById(job.shopId))
  if (!job || !shop) return jsonError("অর্ডার পাওয়া যায়নি", 404)

  return NextResponse.json(await publicJobView(job, shop), { headers: { "Cache-Control": "no-store" } })
}
