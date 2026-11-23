import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { formatNumber } from "@/lib/constants"
import { Transfer } from "@/lib/models"
import { addTransferFile, transferOpen } from "@/lib/transfers"

/** The customer sends one file (multipart `file`) to the shop PC through a "receive" session. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const maxBytes = env.maxUploadBytes
  const tooBig = () => jsonError(`ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(Math.round(maxBytes / 1024 / 1024))} MB।`, 413)
  if (Number(request.headers.get("content-length")) > maxBytes + 64 * 1024) return tooBig()

  await connectDb()
  const transfer = await Transfer.findOne({ publicId: (await params).id, kind: "receive" })
  if (!transfer || !transferOpen(transfer)) return jsonError("সেশনটি শেষ হয়ে গেছে। দোকান থেকে নতুন QR নিন।", 410)

  const file = (await request.formData().catch(() => null))?.get("file")
  if (!(file instanceof File) || file.size === 0) return jsonError("ফাইল পাওয়া যায়নি")
  if (file.size > maxBytes) return tooBig()

  const result = await addTransferFile(transfer, Buffer.from(await file.arrayBuffer()), file.name, "customer")
  if ("error" in result) return jsonError(result.error!, 422)
  return NextResponse.json(result)
}
