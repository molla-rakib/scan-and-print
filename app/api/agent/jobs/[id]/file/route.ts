import { isValidObjectId } from "mongoose"
import { authenticateAgent, jsonError } from "@/lib/api"
import { PrintJob } from "@/lib/models"
import { pagesPerSheetPdf } from "@/lib/pdf"
import { openFile, readFile } from "@/lib/storage"

/**
 * Streams the PDF of a job this agent has claimed. A job with 2 or 4 pages per sheet gets those pages laid
 * out here (the claim then sends no page range), so every agent version prints it as is.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError("Unauthorized", 401)
  const { id } = await params
  if (!isValidObjectId(id)) return jsonError("অনুরোধটি সঠিক নয়")

  const job = await PrintJob.findOne({ _id: id, agentId: agent._id, status: "printing", fileDeleted: false })
  if (!job) return jsonError("ফাইল পাওয়া যায়নি", 404)

  const headers = { "Content-Type": "application/pdf", "Cache-Control": "no-store" }
  if ((job.perSheet ?? 1) > 1) {
    const pdf = await pagesPerSheetPdf(await readFile(job.fileKey), job.pages, job.perSheet)
    return new Response(new Uint8Array(pdf), { headers: { ...headers, "Content-Length": String(pdf.length) } })
  }
  return new Response(await openFile(job.fileKey), { headers: { ...headers, "Content-Length": String(job.fileSize) } })
}
