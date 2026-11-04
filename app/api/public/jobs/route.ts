import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError } from "@/lib/api"
import { randomToken } from "@/lib/crypto"
import { env } from "@/lib/env"
import { nextToken, shopIsOpen } from "@/lib/jobs"
import { PrintJob } from "@/lib/models"
import { countPdfPages, InvalidPdfError } from "@/lib/pdf"
import { findShopBySlug } from "@/lib/public-shop"
import { deleteFile, saveFile } from "@/lib/storage"

const schema = z.object({
  slug: z.string().trim().min(1).max(60),
  file: z.instanceof(File),
})

const DRAFT_LIFETIME_MS = 2 * 60 * 60 * 1000

/** Receives the PDF (multipart), validates it, counts pages, stores it and creates a draft job. */
export async function POST(request: Request) {
  const maxBytes = env.maxUploadBytes
  if (Number(request.headers.get("content-length")) > maxBytes + 64 * 1024) {
    return jsonError(`ফাইলটি অনেক বড়। সর্বোচ্চ ${Math.round(maxBytes / 1024 / 1024)} MB।`, 413)
  }

  const form = await request.formData().catch(() => null)
  const body = schema.safeParse({ slug: form?.get("slug"), file: form?.get("file") })
  if (!body.success) return jsonError("অনুরোধটি সঠিক নয়")
  const { slug, file } = body.data

  const shop = await findShopBySlug(slug)
  if (!shop || !shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 404)
  if (file.size === 0 || file.size > maxBytes) {
    return jsonError(`ফাইলটি অনেক বড়। সর্বোচ্চ ${Math.round(maxBytes / 1024 / 1024)} MB।`, 413)
  }

  const data = Buffer.from(await file.arrayBuffer())
  let pageCount: number
  try {
    pageCount = await countPdfPages(data)
  } catch (error) {
    if (error instanceof InvalidPdfError) return jsonError(error.message, 422)
    throw error
  }

  const fileName = file.name.trim().slice(0, 200) || "document.pdf"
  const fileKey = await saveFile(data, fileName, shop.id)
  try {
    const job = await PrintJob.create({
      publicId: randomToken(12),
      shopId: shop._id,
      token: await nextToken(shop._id),
      fileKey,
      fileName,
      fileSize: file.size,
      pageCount,
      status: "draft",
      draftExpiresAt: new Date(Date.now() + DRAFT_LIFETIME_MS),
    })
    return NextResponse.json({ publicId: job.publicId, pageCount })
  } catch (error) {
    await deleteFile(fileKey).catch(() => {})
    throw error
  }
}
