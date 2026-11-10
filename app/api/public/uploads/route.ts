import { NextResponse, type NextRequest } from "next/server"
import { jsonError } from "@/lib/api"
import { UPLOAD_CHUNK_BYTES, UPLOAD_ID_PATTERN } from "@/lib/constants"
import { env } from "@/lib/env"
import { shopIsOpen } from "@/lib/jobs"
import { UploadPart } from "@/lib/models"
import { findShopBySlug } from "@/lib/public-shop"

/**
 * Receives one piece of a large upload as the raw request body:
 * `POST /api/public/uploads?slug=…&upload=<random id>&index=<0-based>`.
 * Vercel rejects bodies over 4.5 MB, so files above UPLOAD_CHUNK_BYTES are sent this way and joined by
 * `POST /api/public/orders` with `upload` and `parts`.
 */
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const slug = params.get("slug") ?? ""
  const uploadId = params.get("upload") ?? ""
  const index = Number(params.get("index"))
  const maxParts = Math.ceil(env.maxUploadBytes / UPLOAD_CHUNK_BYTES)
  if (!slug || !UPLOAD_ID_PATTERN.test(uploadId) || !Number.isInteger(index) || index < 0 || index >= maxParts) {
    return jsonError("অনুরোধটি সঠিক নয়")
  }
  if (Number(request.headers.get("content-length")) > UPLOAD_CHUNK_BYTES) return jsonError("অংশটি অনেক বড়", 413)

  const shop = await findShopBySlug(slug)
  if (!shop || !shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 404)

  const data = Buffer.from(await request.arrayBuffer())
  if (data.length === 0 || data.length > UPLOAD_CHUNK_BYTES) return jsonError("অংশটি সঠিক নয়", 413)

  try {
    // Re-sending a piece (a retry) replaces it. The unique index stops another shop reusing the id.
    await UploadPart.updateOne(
      { uploadId, index, shopId: shop._id },
      { $set: { data, createdAt: new Date() } },
      { upsert: true }
    )
  } catch {
    return jsonError("আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", 409)
  }
  return NextResponse.json({ ok: true })
}
