import { NextResponse } from "next/server"
import { authenticateAgent, jsonError } from "@/lib/api"
import { rebalanceQueue } from "@/lib/jobs"
import { Device, PrintJob } from "@/lib/models"
import { presignDownload } from "@/lib/storage"

/** Agents poll this every few seconds. Returns the next job for one of the agent's printers, if any. */
export async function POST(request: Request) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)

  await rebalanceQueue(agent.shopId)

  const job = await PrintJob.findOneAndUpdate(
    { agentId: agent._id, status: "queued", deviceId: { $ne: null } },
    { $set: { status: "printing", startedAt: new Date() } },
    { sort: { queuedAt: 1 }, returnDocument: "after" }
  )
  if (!job) return NextResponse.json({ job: null })

  const device = await Device.findById(job.deviceId)
  if (!device) {
    await PrintJob.updateOne({ _id: job._id }, { $set: { status: "queued" }, $unset: { deviceId: 1, agentId: 1 } })
    return NextResponse.json({ job: null })
  }

  return NextResponse.json({
    job: {
      id: job.id,
      token: job.token,
      fileUrl: await presignDownload(job.fileKey),
      fileName: job.fileName,
      pageCount: job.pageCount,
      printer: device.systemName,
      colorMode: job.colorMode,
      copies: job.copies,
    },
  })
}
