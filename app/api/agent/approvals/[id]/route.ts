import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"
import { authenticateAgent, jsonError, parseBody } from "@/lib/api"
import { discardJobFile, queueJob } from "@/lib/jobs"
import { PrintJob } from "@/lib/models"

const schema = z.object({ action: z.enum(["approve", "cancel"]) })

/** The owner approves (after taking the cash) or cancels a cash order from the popup on the shop PC. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const { id } = await params
  const body = await parseBody(request, schema)
  if (!body || !isValidObjectId(id)) return jsonError("অনুরোধটি সঠিক নয়")

  const job = await PrintJob.findOne({ _id: id, shopId: agent.shopId })
  if (!job) return jsonError("অর্ডার পাওয়া যায়নি", 404)

  if (body.action === "approve") {
    if (!(await queueJob(job._id, ["awaiting_approval"]))) return jsonError("এই অর্ডারটি এখন আর অনুমোদন করা যাবে না", 409)
  } else {
    const updated = await PrintJob.findOneAndUpdate(
      { _id: job._id, status: "awaiting_approval" },
      { $set: { status: "cancelled" } },
      { returnDocument: "after" }
    )
    if (!updated) return jsonError("এই অর্ডারটি এখন আর বাতিল করা যাবে না", 409)
    await discardJobFile(updated)
  }
  return NextResponse.json({ ok: true })
}
