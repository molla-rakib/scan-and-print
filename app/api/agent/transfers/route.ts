import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateAgent, jsonError, parseBody } from "@/lib/api"
import { closeExpiredTransfers, openTransfer } from "@/lib/transfers"

const schema = z.object({ kind: z.enum(["scan", "receive"]) })

/**
 * Opens a counter transfer from the agent's counter window: "scan" sends the PC's scans to a phone,
 * "receive" brings a phone's files to the PC. Returns the link and its QR (SVG) for the window to show.
 */
export async function POST(request: Request) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  closeExpiredTransfers().catch((error) => console.error("Closing transfers failed", error))
  const { transfer, url, qrSvg } = await openTransfer(agent.shopId, agent._id, body.kind)
  return NextResponse.json({ id: transfer.publicId, url, qrSvg, closesAt: transfer.closesAt.toISOString() })
}
