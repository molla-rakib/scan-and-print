import { NextResponse } from "next/server"
import { authenticateAgent, jsonError } from "@/lib/api"
import { Transfer } from "@/lib/models"
import { deleteFile, openFile } from "@/lib/storage"
import { fileHeaders } from "@/lib/transfers"

type Params = { params: Promise<{ id: string; fileId: string }> }

async function customerFile(request: Request, params: Params["params"]) {
  const agent = await authenticateAgent(request)
  if (!agent) return { error: jsonError("Unauthorized", 401) }
  const { id, fileId } = await params
  const transfer = await Transfer.findOne({ publicId: id, agentId: agent._id, kind: "receive" })
  const file = transfer?.files.find((f) => String(f._id) === fileId && f.from === "customer")
  if (!transfer || !file) return { error: jsonError("ফাইল পাওয়া যায়নি", 404) }
  return { transfer, file }
}

/** Downloads a file the customer sent, for the agent to save on the PC. */
export async function GET(request: Request, { params }: Params) {
  const { file, error } = await customerFile(request, params)
  if (error) return error
  if (file.deleted) return jsonError("ফাইলটি আর নেই", 410)
  return new Response(await openFile(file.fileKey), { headers: fileHeaders(file, true) })
}

/** The agent saved the file on the PC: mark it fetched and delete the server copy. */
export async function DELETE(request: Request, { params }: Params) {
  const { transfer, file, error } = await customerFile(request, params)
  if (error) return error
  if (!file.deleted) await deleteFile(file.fileKey)
  await Transfer.updateOne(
    { _id: transfer._id, "files._id": file._id },
    { $set: { "files.$.deleted": true, "files.$.fetchedAt": new Date() } }
  )
  return NextResponse.json({ ok: true })
}
