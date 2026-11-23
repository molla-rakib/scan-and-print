import { NextResponse } from "next/server"
import { authenticateAgent, jsonError } from "@/lib/api"
import { Transfer } from "@/lib/models"
import { closeTransfer, transferView } from "@/lib/transfers"

async function agentTransfer(request: Request, params: Promise<{ id: string }>) {
  const agent = await authenticateAgent(request)
  if (!agent) return { error: jsonError("Unauthorized", 401) }
  const transfer = await Transfer.findOne({ publicId: (await params).id, agentId: agent._id })
  if (!transfer) return { error: jsonError("সেশন পাওয়া যায়নি", 404) }
  return { transfer }
}

/** The session as the agent sees it: is it open, and which files are in it (the customer's to fetch). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { transfer, error } = await agentTransfer(request, params)
  if (error) return error
  return NextResponse.json(transferView(transfer))
}

/** Closes the session from the PC ("শেষ"); its files are deleted. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { transfer, error } = await agentTransfer(request, params)
  if (error) return error
  await closeTransfer(transfer)
  return NextResponse.json({ ok: true })
}
