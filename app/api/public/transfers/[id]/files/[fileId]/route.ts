import { jsonError } from "@/lib/api"
import { connectDb } from "@/lib/db"
import { Transfer } from "@/lib/models"
import { openFile } from "@/lib/storage"
import { fileHeaders, transferOpen } from "@/lib/transfers"

/**
 * Downloads a file of the session to the phone: the shop's scans (the point of a "scan" session). `?inline=1`
 * shows it in the browser instead of saving it, for previews.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params
  await connectDb()
  const transfer = await Transfer.findOne({ publicId: id })
  const file = transfer?.files.find((f) => String(f._id) === fileId && f.from === "shop")
  if (!transfer || !file || file.deleted || !transferOpen(transfer)) return jsonError("ফাইলটি আর নেই", 410)
  const inline = new URL(request.url).searchParams.get("inline") === "1"
  return new Response(await openFile(file.fileKey), { headers: fileHeaders(file, !inline) })
}
