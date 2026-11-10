import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateAgent, jsonError, parseBody } from "@/lib/api"
import { PAPER_SIZES } from "@/lib/constants"
import { rebalanceQueue } from "@/lib/jobs"
import { Agent, Device } from "@/lib/models"

const schema = z.object({
  machineName: z.string().trim().max(120).optional(),
  version: z.string().trim().max(40).optional(),
  printers: z
    .array(
      z.object({
        systemName: z.string().trim().min(1).max(200),
        color: z.boolean().default(false),
        duplex: z.boolean().default(false),
        // Agents 1.1.0+: which of our paper sizes the driver supports. Unknown values are ignored.
        paperSizes: z
          .array(z.string())
          .max(100)
          .optional()
          .transform((sizes) => sizes?.filter((s): s is (typeof PAPER_SIZES)[number] => PAPER_SIZES.includes(s as never))),
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
        $set: {
          duplex: printer.duplex,
          state: printer.state,
          present: true,
          ...(printer.paperSizes ? { paperSizes: printer.paperSizes } : {}),
        },
      },
      { upsert: true }
    )
  }
  await Device.updateMany({ agentId: agent._id, systemName: { $nin: reported } }, { $set: { present: false } })
  await rebalanceQueue(agent.shopId)

  const devices = await Device.find({ agentId: agent._id }).select("systemName enabled")

  return NextResponse.json({
    devices: devices.map((d) => ({ systemName: d.systemName, enabled: d.enabled })),
  })
}
