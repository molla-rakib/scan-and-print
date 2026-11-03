import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { z } from "zod"
import { authenticateAgent, jsonError, parseBody } from "@/lib/api"
import { discardJobFile } from "@/lib/jobs"
import { PrintJob } from "@/lib/models"

const schema = z.object({
  status: z.enum(["completed", "failed"]),
  error: z.string().trim().max(500).optional(),
})

/** Agents report the outcome of a job they claimed. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const { id } = await params
  const body = await parseBody(request, schema)
  if (!body || !isValidObjectId(id)) return jsonError("অনুরোধটি সঠিক নয়")

  const job = await PrintJob.findOneAndUpdate(
    { _id: id, agentId: agent._id, status: "printing" },
    {
      $set:
        body.status === "completed"
          ? { status: "completed", completedAt: new Date() }
          : { status: "failed", error: body.error || "প্রিন্টার একটি ত্রুটি জানিয়েছে" },
    },
    { returnDocument: "after" }
  )
  if (!job) return jsonError("Job not found", 404)

  // Delete customer documents as soon as they are printed. Failed jobs keep the file for a reprint.
  if (job.status === "completed") await discardJobFile(job)

  return NextResponse.json({ ok: true })
}
