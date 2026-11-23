import { NextResponse } from "next/server"
import { authenticateAgent, jsonError } from "@/lib/api"
import { env } from "@/lib/env"
import { Transfer } from "@/lib/models"
import { addTransferFile, transferOpen } from "@/lib/transfers"

/** The agent sends one scanned file (raw body, name in `?name=`) to a "scan" session. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const transfer = await Transfer.findOne({ publicId: (await params).id, agentId: agent._id, kind: "scan" })
  if (!transfer || !transferOpen(transfer)) return jsonError("সেশনটি শেষ হয়ে গেছে", 410)

  const name = new URL(request.url).searchParams.get("name") ?? ""
  const data = Buffer.from(await request.arrayBuffer())
  if (data.length === 0) return jsonError("ফাইলটি খালি")
  if (data.length > env.maxUploadBytes) return jsonError("ফাইলটি অনেক বড়", 413)

  const result = await addTransferFile(transfer, data, name, "shop")
  if ("error" in result) return jsonError(result.error!, 422)
  return NextResponse.json(result)
}
