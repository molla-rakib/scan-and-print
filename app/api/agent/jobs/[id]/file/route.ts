import { isValidObjectId } from "mongoose"
import { authenticateAgent, jsonError } from "@/lib/api"
import { PrintJob } from "@/lib/models"
import { openFile } from "@/lib/storage"

/** Streams the PDF of a job this agent has claimed. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const { id } = await params
  if (!isValidObjectId(id)) return jsonError("অনুরোধটি সঠিক নয়")

  const job = await PrintJob.findOne({ _id: id, agentId: agent._id, status: "printing", fileDeleted: false })
  if (!job) return jsonError("ফাইল পাওয়া যায়নি", 404)

  return new Response(await openFile(job.fileKey), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(job.fileSize),
      "Cache-Control": "no-store",
    },
  })
}
