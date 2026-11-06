import { NextResponse } from "next/server"
import { authenticateAgent, jsonError } from "@/lib/api"
import { PrintJob } from "@/lib/models"

/** Cash orders waiting for the owner's approval, for the popup on the shop PC. */
export async function GET(request: Request) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)

  const jobs = await PrintJob.find({ shopId: agent.shopId, status: "awaiting_approval" })
    .sort({ createdAt: 1 })
    .limit(20)
    .select("token pageCount copies colorMode amount createdAt")

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      token: job.token,
      pageCount: job.pageCount,
      copies: job.copies,
      colorMode: job.colorMode,
      amount: job.amount,
      createdAt: job.createdAt.toISOString(),
    })),
  })
}
