import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateAgent, jsonError, parseBody } from "@/lib/api"
import { rebalanceQueue } from "@/lib/jobs"
import { Agent, Device, PrintJob } from "@/lib/models"

const schema = z.object({
  machineName: z.string().trim().max(120).optional(),
  version: z.string().trim().max(40).optional(),
  printers: z
    .array(
      z.object({
        systemName: z.string().trim().min(1).max(200),
        color: z.boolean().default(false),
        duplex: z.boolean().default(false),
        state: z.string().trim().max(40).default("idle"),
      })
    )
    .max(50),
})

/** Agents report their installed printers every ~30 seconds. */
export async function POST(request: Request) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  await Agent.updateOne(
    { _id: agent._id },
    { $set: { machineName: body.machineName ?? agent.machineName, version: body.version ?? agent.version } }
  )

  const reported = body.printers.map((p) => p.systemName)
  for (const printer of body.printers) {
    await Device.updateOne(
      { agentId: agent._id, systemName: printer.systemName },
      {
        // The owner can rename a device or override its color capability; those are only set once.
        $setOnInsert: { shopId: agent.shopId, name: printer.systemName, color: printer.color, enabled: false },
        $set: { duplex: printer.duplex, state: printer.state, present: true },
      },
      { upsert: true }
    )
  }
  await Device.updateMany({ agentId: agent._id, systemName: { $nin: reported } }, { $set: { present: false } })
  await rebalanceQueue(agent.shopId)

  const devices = await Device.find({ agentId: agent._id }).select("systemName enabled")
  const pendingApprovals = await PrintJob.countDocuments({ shopId: agent.shopId, status: "awaiting_approval" })

  return NextResponse.json({
    devices: devices.map((d) => ({ systemName: d.systemName, enabled: d.enabled })),
    pendingApprovals,
  })
}
