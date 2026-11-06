import { NextResponse } from "next/server"
import { authenticateAgent, jsonError } from "@/lib/api"
import { rebalanceQueue } from "@/lib/jobs"
import { Device, PrintJob } from "@/lib/models"
import { env } from "@/lib/env"
import { sweepOrphanFiles } from "@/lib/storage"

/** Agents poll this every few seconds. Returns the next job for one of the agent's printers, if any. */
export async function POST(request: Request) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)

  await rebalanceQueue(agent.shopId)
  sweepOrphanFiles().catch((error) => console.error("File sweep failed", error))

  // Lets the shop PC show the cash-approval popup within one poll interval.
  const pendingApprovals = await PrintJob.countDocuments({ shopId: agent.shopId, status: "awaiting_approval" })

  const job = await PrintJob.findOneAndUpdate(
    { agentId: agent._id, status: "queued", deviceId: { $ne: null } },
    { $set: { status: "printing", startedAt: new Date() } },
    { sort: { queuedAt: 1 }, returnDocument: "after" }
  )
  if (!job) return NextResponse.json({ job: null, pendingApprovals })

  const device = await Device.findById(job.deviceId)
  if (!device) {
    await PrintJob.updateOne({ _id: job._id }, { $set: { status: "queued" }, $unset: { deviceId: 1, agentId: 1 } })
    return NextResponse.json({ job: null, pendingApprovals })
  }

  return NextResponse.json({
    pendingApprovals,
    job: {
      id: job.id,
      token: job.token,
      // Download with the same bearer token.
      fileUrl: `${env.appUrl}/api/agent/jobs/${job.id}/file`,
      fileName: job.fileName,
      pageCount: job.pageCount,
      printer: device.systemName,
      colorMode: job.colorMode,
      copies: job.copies,
    },
  })
}
