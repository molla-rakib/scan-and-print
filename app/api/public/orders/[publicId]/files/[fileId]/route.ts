import { NextResponse } from "next/server"
import { isValidObjectId } from "mongoose"
import { jsonError } from "@/lib/api"
import { connectDb } from "@/lib/db"
import { Order, PrintJob } from "@/lib/models"
import { deleteFile } from "@/lib/storage"

/** Removes a file from a draft order (the customer tapped ✕ before paying). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ publicId: string; fileId: string }> }) {
  const { publicId, fileId } = await params
  if (!isValidObjectId(fileId)) return jsonError("অনুরোধটি সঠিক নয়")
  await connectDb()
  const order = await Order.findOne({ publicId, status: "draft" })
  if (!order) return jsonError("অর্ডারটি আর বদলানো যাবে না", 409)

  const job = await PrintJob.findOneAndDelete({ _id: fileId, orderId: order._id, status: "draft" })
  if (job) await deleteFile(job.fileKey).catch((error) => console.error("Failed to delete file", job.fileKey, error))
  return NextResponse.json({ ok: true })
}
